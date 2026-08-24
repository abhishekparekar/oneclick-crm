import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, FlatList, ActivityIndicator, ScrollView, Animated, Modal, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import { getActiveTaskStatusesApi, submitFollowUpApi } from "../../api/taskService";
import { getMeApi } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import TaskActionModal from "../../components/TaskActionModal";

const TEAL = "#1268D9";
const TEAL_LIGHT = "rgba(18, 104, 217, 0.1)";
const BORDER = "#e2e8f0";

const STATUS_COLORS = {
  "pending": { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1", label: "Pending" },
  "re_pending": { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1", label: "Re-Pending" },
  "in_process": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "In Process" },
  "re_in_process": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "Re-In Process" },
  "overdue": { bg: "#fef2f2", text: "#ef4444", border: "#fca5a5", label: "Overdue" },
  "complete": { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0", label: "Completed" },
  "late_complete": { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0", label: "Late Completed" },
  "active": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "Active" }
};

const normalizeStatusValue = (val) => {
  if (!val) return "";
  let s = val.toLowerCase().replace(/-/g, "_");
  if (s === "in_progress") return "in_process";
  if (s === "completed" || s === "done") return "complete";
  if (s === "late_completed") return "late_complete";
  return s;
};

const PRIORITY_CONFIG = {
  high:   { text: "#ef4444", bg: "#ffffffff", border: "#fecaca", dot: "#ef4444", label: "High",   icon: "flame-outline" },
  medium: { text: "#f59e0b", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", label: "Medium", icon: "alert-circle-outline" },
  low:    { text: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", dot: "#10b981", label: "Low",    icon: "checkmark-circle-outline" },
};

const getPriorityConfig = (prio) =>
  PRIORITY_CONFIG[prio?.toLowerCase()] || PRIORITY_CONFIG.low;

const getDurationString = (startDate, endDate) => {
  const diffMs = Math.abs(endDate - startDate);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / 1000 / 60) % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (parts.length === 0 || minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ");
};

const TaskCard = ({ item, navigation, handleStartTask, activeTab, canCancel, onCancel }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pConfig = getPriorityConfig(item.priority);

  const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete", "re_complete", "re_completed"].includes(item.status?.toLowerCase());
  const effectiveEndDate = item.endDateTime ? new Date(item.endDateTime) : null;
  const isOverdue =
    effectiveEndDate &&
    effectiveEndDate < new Date() &&
    !isDone &&
    !item.isTemplate;

  const deptName = item.departmentId?.name || "No Department";

  const startDate = item.startDateTime
    ? new Date(item.startDateTime).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
  const endDate = item.endDateTime
    ? new Date(item.endDateTime).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  const subtasks = item.subtasks || [];
  const completedSub = subtasks.filter((s) => s.completed).length;
  const subProgress = subtasks.length > 0 ? completedSub / subtasks.length : 0;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 22 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22 }).start();

  // status display configurations
  let statusLabel = item.status?.replace(/_/g, " ") || "Pending";
  let statusColor = "#ca8a04";
  let statusBg    = "#fef9c3";
  let statusBdr   = "#fef08a";

  if (isDone) {
    if (item.status === "late_complete" || item.status === "re_late_complete") {
      statusLabel = "Late Completed";
      statusColor = "#ca8a04";
      statusBg    = "#fef9c3";
      statusBdr   = "#fef08a";
    } else {
      statusLabel = "Completed";
      statusColor = "#16a34a";
      statusBg    = "#dcfce7";
      statusBdr   = "#bbf7d0";
    }
  } else if (isOverdue) {
    statusLabel = "Overdue";
    statusColor = "#ef4444";
    statusBg    = "#fef2f2";
    statusBdr   = "#fca5a5";
  } else if (item.status === "in_process" || item.status === "re_in_process") {
    statusLabel = item.status === "re_in_process" ? "Re-In Process" : "In Process";
    statusColor = "#2563eb";
    statusBg    = "#eff6ff";
    statusBdr   = "#bfdbfe";
  } else if (item.status === "re_pending") {
    statusLabel = "Re-Pending";
    statusColor = "#7c3aed";
    statusBg    = "#f5f3ff";
    statusBdr   = "#ddd6fe";
  }

  // Delay text
  let delayText = "";
  if (item.status === "late_complete" && item.delayedDuration) {
    const { days = 0, hours = 0 } = item.delayedDuration;
    delayText = `${days}d ${hours}h late`;
  } else if (isOverdue && item.endDateTime) {
    delayText = `${getDurationString(new Date(item.endDateTime), new Date())} overdue`;
  } else if (isDone && ["complete", "completed"].includes(item.status?.toLowerCase()) && item.endDateTime) {
    const completedDate = new Date(item.updatedAt || item.endDateTime);
    delayText = `Completed on ${completedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  // Status-based icon and gradient for the left icon box
  let statusIconName = "ellipse-outline";
  let statusColorsArray = ["#fef08a", "#ca8a04"];

  if (isDone) {
    if (item.status === "late_complete" || item.status === "re_late_complete") {
      statusIconName = "warning-outline";
      statusColorsArray = ["#fcd34d", "#d97706"];
    } else {
      statusIconName = "checkmark-circle-outline";
      statusColorsArray = ["#6ee7b7", "#10b981"];
    }
  } else if (isOverdue) {
    statusIconName = "alert-circle-outline";
    statusColorsArray = ["#fca5a5", "#ef4444"];
  } else if (item.status === "in_process" || item.status === "re_in_process") {
    statusIconName = "play-circle-outline";
    statusColorsArray = ["#bfdbfe", "#2563eb"];
  } else if (item.status === "re_pending") {
    statusIconName = "repeat-outline";
    statusColorsArray = ["#e9d5ff", "#7c3aed"];
  } else if (item.isTemplate) {
    statusIconName = "repeat-outline";
    statusColorsArray = ["#e9d5ff", "#7c3aed"];
  }

  const isBothType = item.assignmentType === "both";

  return (
    <Animated.View style={[styles.taskCard, isDone && styles.taskCardDone, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.taskCardTouchable}
        onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerTaskDetails", params: { taskId: item._id } })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* ── Card Body ── */}
        <View style={styles.taskCardBody}>
          {/* Left: status-based gradient icon box */}
          <LinearGradient colors={statusColorsArray} style={styles.taskIconBox}>
            <Ionicons name={statusIconName} size={18} color="#ffffff" />
          </LinearGradient>

          {/* Center: text content */}
          <View style={styles.taskTextBlock}>
            {/* Title row */}
            <View style={styles.taskTitleRow}>
              <Text
                style={[styles.taskTitle, isDone && styles.taskTitleDone]}
                numberOfLines={1}
              >
                {item.taskId ? `${item.taskId} - ${item.title}` : item.title}
              </Text>
              {item.isTemplate ? (
                <View style={[styles.recurringBadge, { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }]}>
                  <Ionicons name="repeat-outline" size={9} color="#7c3aed" />
                  <Text style={[styles.recurringBadgeText, { color: "#7c3aed" }]}>Parent Template</Text>
                </View>
              ) : (item.isGeneratedFromTemplate || item.isRecurring || item.parentTemplateId) ? (
                <View style={[styles.recurringBadge, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                  <Ionicons name="repeat-outline" size={9} color="#2563eb" />
                  <Text style={[styles.recurringBadgeText, { color: "#2563eb" }]}>Recurring Task</Text>
                </View>
              ) : null}
              {item.shiftReason && (
                <View style={styles.shiftedBadge}>
                  <Ionicons name="swap-horizontal-outline" size={9} color="#2563eb" />
                  <Text style={styles.shiftedBadgeText}>Shifted</Text>
                </View>
              )}
            </View>

            {/* Dept + Date meta */}
            <View style={styles.taskMetaLine}>
              <Ionicons name="business-outline" size={10} color="#94a3b8" />
              <Text style={styles.taskMetaText} numberOfLines={1}>{deptName}</Text>
              {(startDate || endDate) && (
                <>
                  <View style={styles.metaDot} />
                  <Ionicons name="calendar-outline" size={10} color={isOverdue ? "#ef4444" : "#94a3b8"} />
                  <Text style={[styles.taskMetaText, isOverdue && { color: "#ef4444" }]}>
                    {endDate || startDate}
                  </Text>
                </>
              )}
            </View>

            {/* Subtask progress bar */}
            {subtasks.length > 0 && (
              <View style={styles.subtaskRow}>
                <View style={styles.subtaskBarTrack}>
                  <View
                    style={[
                      styles.subtaskBarFill,
                      {
                        width: `${Math.round(subProgress * 100)}%`,
                        backgroundColor: subProgress === 1 ? "#10b981" : "#0d9488",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.subtaskLabel}>
                  {completedSub}/{subtasks.length}
                </Text>
              </View>
            )}
          </View>

          {/* Right: priority badge + start button */}
          <View style={styles.taskRightCol}>
            <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg, borderColor: pConfig.border }]}>
              <Text style={[styles.priorityBadgeText, { color: pConfig.text }]}>{pConfig.label}</Text>
            </View>

            {/* Quick Start Button for Manager Tasks if pending */}
            {!isDone && (item.status === "pending" || item.status === "re_pending") && (
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: "#2563eb" }]}
                onPress={() => handleStartTask(item)}
              >
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={styles.quickActionText}>Start</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.taskDivider} />

        {/* ── Action Strip ── */}
        <View style={styles.taskActionStrip}>
          {/* Status chip */}
          <View style={styles.statusAndDelayWrap}>
            <View style={[styles.statusChip, { backgroundColor: statusBg, borderColor: statusBdr }]}>
              <Ionicons
                name={
                  isOverdue
                    ? "alert-circle-outline"
                    : isDone
                    ? item.status === "late_complete" || item.status === "re_late_complete"
                      ? "warning-outline"
                      : "checkmark-circle-outline"
                    : item.status === "in_process" || item.status === "re_in_process"
                    ? "play-circle-outline"
                    : item.status === "re_pending"
                    ? "repeat-outline"
                    : "ellipse-outline"
                }
                size={13}
                color={statusColor}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {delayText ? (
              <Text style={[styles.delayText, isOverdue ? styles.delayTextOverdue : isDone && item.status === "complete" ? styles.delayTextCompleted : styles.delayTextLate]}>
                {delayText}
              </Text>
            ) : null}
          </View>

          {/* Right Section containing Assignee, View & Cancel buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {/* Assignee Avatar / Name display at bottom for Team Tasks */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {isBothType && (
                <View style={{ backgroundColor: "#f5f3ff", borderWidth: 0.5, borderColor: "#ddd6fe", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 8, fontWeight: "700", color: "#7c3aed" }}>MYSELF & TEAM</Text>
                </View>
              )}
              {activeTab === "teamTasks" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: TEAL, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                      {(item.assignedTo?.[0]?.firstName || "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#475569" }}>
                    {item.assignedTo?.[0]?.firstName || "Unassigned"}
                    {item.assignedTo?.length > 1 ? ` +${item.assignedTo.length - 1}` : ""}
                  </Text>
                </View>
              )}
            </View>

            {/* View button */}
            <TouchableOpacity 
              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "#f1f5f9" }} 
              onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerTaskDetails", params: { taskId: item._id } })}
            >
              <Ionicons name="eye-outline" size={12} color="#475569" />
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#475569" }}>View</Text>
            </TouchableOpacity>

            {/* Cancel button — only if permission granted and task is not already done/cancelled */}
            {canCancel && !isDone && item.status !== "cancelled" && (
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5" }}
                onPress={() => onCancel(item)}
              >
                <Ionicons name="close-circle-outline" size={12} color="#ef4444" />
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#ef4444" }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ManagerMyTasksScreen = ({ navigation, route }) => {
  useEffect(() => {
    if (route.params?.activeTab !== undefined) {
      setActiveTab(route.params.activeTab);
    }
    if (route.params?.taskFilter !== undefined) {
      setTaskFilter(route.params.taskFilter);
    }
    if (route.params?.dateFilter) {
      setDateFilter(route.params.dateFilter);
    }
    if (route.params?.deadlineComingFilter !== undefined) {
      setDeadlineComingFilter(route.params.deadlineComingFilter);
    }
    if (route.params?.departmentId) {
      setSelectedDepts([route.params.departmentId]);
    } else if (route.params?.departmentId === "") {
      setSelectedDepts([]);
    }
  }, [route.params]);

  const [activeTab, setActiveTab] = useState("myTasks"); // "myTasks", "teamTasks"
  const [taskFilter, setTaskFilter] = useState(""); // "" = All
  const [dateFilter, setDateFilter] = useState("today");
  const [deadlineComingFilter, setDeadlineComingFilter] = useState("");
  const {
    myManagerTasks,
    teamTasks,
    projects,
    loadingTasks,
    loadingProjects,
    fetchMyManagerTasks,
    fetchTeamTasks,
    fetchProjects,
    taskPermissions,
    fetchTaskPermissions,
    updateTaskStatusData,
    dashboardData,
    fetchDashboard,
    teamData,
    fetchTeam,
    removeTask,
  } = useManagerController();

  const { hasPermission, updateUser } = useAuth();
  const canCancel = hasPermission("tasks", "cancel");
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [search, setSearch] = useState("");

  // Multi-select filters
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  // Cancel task modal
  const [cancelModal, setCancelModal] = useState({ visible: false, task: null });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Status Action Modal State
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const handleCancelPress = (task) => {
    setCancelModal({ visible: true, task });
    setCancelReason("");
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for cancelling this task.");
      return;
    }
    setCancelLoading(true);
    try {
      await removeTask(cancelModal.task._id);
      setCancelModal({ visible: false, task: null });
      setCancelReason("");
    } catch (e) {
      Alert.alert("Error", "Failed to cancel task. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const manager = dashboardData?.manager || {};
  const departmentsList = useMemo(() => {
    const list = [];
    if (manager?.departmentId) {
      const dId = typeof manager.departmentId === "object" ? manager.departmentId?._id : manager.departmentId;
      const dName = typeof manager.departmentId === "object" ? (manager.departmentId?.name || "My Department") : "My Department";
      if (dId) {
        list.push({ _id: dId, name: dName });
      }
    }
    if (Array.isArray(manager?.accessibleDepartments)) {
      manager.accessibleDepartments.forEach(dept => {
        if (!dept) return;
        const id = typeof dept === "object" ? dept?._id : dept;
        const name = typeof dept === "object" ? (dept?.name || "Accessible Dept") : "Accessible Dept";
        if (id && !list.some(x => String(x?._id) === String(id))) {
          list.push({ _id: id, name });
        }
      });
    }
    return list;
  }, [manager]);

  const visibleEmployees = useMemo(() => {
    const list = teamData || [];
    const accessibleDeptIds = departmentsList.map(d => d._id);
    
    let filtered = list.filter(emp => {
      const empDeptId = emp.departmentId?._id || emp.departmentId;
      return empDeptId && accessibleDeptIds.includes(empDeptId);
    });

    if (selectedDepts.length > 0) {
      filtered = filtered.filter(emp => {
        const empDeptId = emp.departmentId?._id || emp.departmentId;
        return empDeptId && selectedDepts.includes(empDeptId);
      });
    }
    return filtered;
  }, [teamData, selectedDepts, departmentsList]);

  const toggleDeptSelection = (deptId) => {
    if (deptId === "") {
      setSelectedDepts([]);
    } else {
      setSelectedDepts(prev =>
        prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
      );
    }
  };

  const toggleEmployeeSelection = (empId) => {
    if (empId === "") {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(prev =>
        prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTaskPermissions();
      fetchMyManagerTasks();
      fetchTeamTasks();
      fetchDashboard(true);
      fetchTeam(true);
    }, [])
  );

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const res = await getActiveTaskStatusesApi();
        if (res?.data?.success) {
          setTaskStatuses(res.data.statuses || []);
        }
      } catch (e) {
        console.error("Failed to load task statuses:", e);
      }
    };
    loadStatuses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [{ data }] = await Promise.all([
        getMeApi(),
        fetchMyManagerTasks(true),
        fetchTeamTasks(true),
        fetchDashboard(true),
        fetchTeam(true)
      ]);
      if (data?.user) {
        await updateUser(data.user);
      }
    } catch (e) {
      console.log(e);
    }
    setRefreshing(false);
  };

  const handleStartTask = (task) => {
    setSelectedTask(task);
    setActionType("in_process");
    setActionModalVisible(true);
  };

  const handleActionSubmit = async (data) => {
    if (!selectedTask) return;
    try {
      setSubmittingAction(true);
      if (actionType === "follow_up") {
        await submitFollowUpApi(selectedTask._id, {
          remark: data.remarks,
          nextFollowUpDate: data.nextFollowUpDate || null,
          attachments: data.attachments || []
        });
      } else {
        const payload = {
          remarks: data.remarks,
          finalRemarks: data.remarks,
          attachments: data.attachments || [],
          nextFollowUpDate: data.nextFollowUpDate || null
        };
        await updateTaskStatusData(selectedTask._id, actionType, payload);
      }
      setActionModalVisible(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err?.response?.data?.message || "Failed to start task.");
    } finally {
      setSubmittingAction(false);
    }
  };


  const renderProject = ({ item }) => {
    const st = (item.status || "").toLowerCase();
    const statusCol = STATUS_COLORS[st] || STATUS_COLORS["todo"];
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerProjectDetails", params: { projectId: item._id } })}
        style={styles.cardContainer}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCol.bg, borderColor: statusCol.border }]}>
            <Text style={[styles.statusText, { color: statusCol.text }]}>{statusCol.label}</Text>
          </View>
        </View>
        
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{item.members?.length || 0} Members</Text>
          </View>
          {item.endDate && (
            <View style={styles.metaRow}>
              <Ionicons name="flag-outline" size={14} color="#64748b" />
              <Text style={styles.metaText}>Due: {new Date(item.endDate).toLocaleDateString()}</Text>
            </View>
          )}
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  let listData = [];
  const renderItemFn = ({ item }) => (
    <TaskCard
      item={item}
      navigation={navigation}
      handleStartTask={handleStartTask}
      activeTab={activeTab}
      canCancel={canCancel}
      onCancel={handleCancelPress}
    />
  );
  let emptyMsg = "";
  
  if (deadlineComingFilter) {
    listData = [...myManagerTasks, ...teamTasks];
    emptyMsg = "No tasks with deadlines yesterday, today, or tomorrow.";
  } else if (activeTab === "myTasks") {
    listData = myManagerTasks;
    emptyMsg = "You have no assigned tasks.";
  } else {
    listData = teamTasks;
    emptyMsg = "No team tasks found.";
  }

  const stats = useMemo(() => {
    let tasksToUse = deadlineComingFilter ? [...myManagerTasks, ...teamTasks] : (activeTab === "myTasks" ? myManagerTasks : (activeTab === "teamTasks" ? teamTasks : []));

    if (selectedDepts.length > 0) {
      tasksToUse = tasksToUse.filter(t => {
        const deptId = t.departmentId?._id || t.departmentId;
        return deptId && selectedDepts.includes(deptId);
      });
    }

    if (selectedEmployeeIds.length > 0) {
      tasksToUse = tasksToUse.filter(t => {
        if (t.assignees && t.assignees.length > 0) {
          return t.assignees.some(emp => selectedEmployeeIds.includes(emp._id || emp));
        }
        if (t.assignedTo) {
          const assId = t.assignedTo._id || t.assignedTo;
          return selectedEmployeeIds.includes(assId);
        }
        return false;
      });
    }
    
    const completeCount = tasksToUse.filter((t) => ["complete", "completed", "done"].includes(normalizeStatusValue(t.status))).length;
    const lateCompleteCount = tasksToUse.filter((t) => normalizeStatusValue(t.status) === "late_complete" || normalizeStatusValue(t.status) === "re_late_complete").length;
    const inProcessCount = tasksToUse.filter((t) => normalizeStatusValue(t.status) === "in_process").length;
    const rePendingCount = tasksToUse.filter((t) => ["re_pending", "re_in_process"].includes(normalizeStatusValue(t.status))).length;
    const overdueCount = tasksToUse.filter(
      (t) => (normalizeStatusValue(t.status) === "overdue" || (t.endDateTime && new Date(t.endDateTime) < new Date() && !["complete", "completed", "done", "late_complete", "re_late_complete"].includes(normalizeStatusValue(t.status))))
    ).length;

    const totalActiveTasks = tasksToUse.filter(t => !t.isTemplate).length;
    const finishedTasks = completeCount + lateCompleteCount;
    const progress = totalActiveTasks > 0 ? Math.round((finishedTasks / totalActiveTasks) * 100) : 0;
    
    return { completeCount, lateCompleteCount, inProcessCount, rePendingCount, overdueCount, progress };
  }, [activeTab, myManagerTasks, teamTasks, selectedDepts, selectedEmployeeIds]);

  const matchesDateFilter = (task, tabKey) => {
    if (tabKey === "re_open") {
      return task.reopenCount > 0 || task.status === "re_pending" || task.status === "re_in_process";
    }
    if (tabKey === "all_time") return true;

    const now = new Date();
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - distanceToMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const checkDayMatch = (targetDay) => {
      const isSameDay = (d) => {
        if (!d) return false;
        const date = new Date(d);
        return date.getFullYear() === targetDay.getFullYear() &&
               date.getMonth() === targetDay.getMonth() &&
               date.getDate() === targetDay.getDate();
      };
      return isSameDay(task.startDateTime || task.startDate) ||
             isSameDay(task.nextFollowUpDate) ||
             isSameDay(task.endDateTime || task.endDate);
    };

    const checkRangeMatch = (startRange, endRange) => {
      const isBetween = (d) => {
        if (!d) return false;
        const date = new Date(d);
        return date >= startRange && date < endRange;
      };
      return isBetween(task.startDateTime || task.startDate) ||
             isBetween(task.nextFollowUpDate) ||
             isBetween(task.endDateTime || task.endDate);
    };

    switch (tabKey) {
      case "today":
        return checkDayMatch(today);
      case "yesterday":
        return checkDayMatch(yesterday);
      case "this_week":
        return checkRangeMatch(startOfWeek, endOfWeek);
      case "last_month":
        return checkRangeMatch(startOfLastMonth, startOfThisMonth);
      case "this_month":
        return checkRangeMatch(startOfThisMonth, startOfNextMonth);
      default:
        return true;
    }
  };

  const matchesDeadlineComingFilter = (task, filterVal) => {
    if (!filterVal) return true;
    if (task.isTemplate) return false;

    const now = new Date();
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkDayMatch = (targetDay) => {
      const isSameDay = (d) => {
        if (!d) return false;
        const date = new Date(d);
        return date.getFullYear() === targetDay.getFullYear() &&
               date.getMonth() === targetDay.getMonth() &&
               date.getDate() === targetDay.getDate();
      };
      return isSameDay(task.startDateTime || task.startDate) ||
             isSameDay(task.nextFollowUpDate) ||
             isSameDay(task.endDateTime || task.endDate);
    };

    if (filterVal === "today") return checkDayMatch(today);
    if (filterVal === "tomorrow") return checkDayMatch(tomorrow);
    if (filterVal === "yesterday") return checkDayMatch(yesterday);
    if (filterVal === "today_tomorrow") return checkDayMatch(today) || checkDayMatch(tomorrow);
    return checkDayMatch(yesterday) || checkDayMatch(today) || checkDayMatch(tomorrow);
  };

  let filteredData = listData.filter(t => matchesDateFilter(t, dateFilter));

  if (search.trim()) {
    const q = search.toLowerCase();
    filteredData = filteredData.filter(t => 
      t.title?.toLowerCase().includes(q) || 
      t.description?.toLowerCase().includes(q) ||
      t.taskId?.toLowerCase().includes(q)
    );
  }

  if (selectedDepts.length > 0) {
    filteredData = filteredData.filter(t => {
      const deptId = t.departmentId?._id || t.departmentId;
      return deptId && selectedDepts.includes(deptId);
    });
  }

  if (selectedEmployeeIds.length > 0) {
    filteredData = filteredData.filter(t => {
      if (t.assignees && t.assignees.length > 0) {
        return t.assignees.some(emp => selectedEmployeeIds.includes(emp._id || emp));
      }
      if (t.assignedTo) {
        const assId = t.assignedTo._id || t.assignedTo;
        return selectedEmployeeIds.includes(assId);
      }
      return false;
    });
  }

  if (taskFilter === "recurring") {
    filteredData = filteredData.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId);
  } else {
    filteredData = filteredData.filter(t => !t.isTemplate);
    if (taskFilter !== "") {
      const target = normalizeStatusValue(taskFilter);
      filteredData = filteredData.filter(t => normalizeStatusValue(t.status || "") === target);
    }
  }

  if (deadlineComingFilter) {
    filteredData = filteredData.filter(t => matchesDeadlineComingFilter(t, deadlineComingFilter));
  }

  // Deduplicate by _id to avoid React duplicate key warnings
  const seenIds = new Map();
  filteredData = filteredData.filter(t => {
    if (!t._id || seenIds.has(t._id)) return false;
    seenIds.set(t._id, true);
    return true;
  });

  const getStatusCount = (statusKey) => {
    const src = deadlineComingFilter ? [...myManagerTasks, ...teamTasks] : (activeTab === "myTasks" ? myManagerTasks : teamTasks);
    let base = src;
    if (deadlineComingFilter) {
      const seenIds = new Set();
      base = base.filter(t => {
        if (!t._id || seenIds.has(t._id.toString())) return false;
        seenIds.add(t._id.toString());
        return true;
      });
      base = base.filter(t => matchesDeadlineComingFilter(t, deadlineComingFilter));
    } else {
      base = base.filter(t => matchesDateFilter(t, dateFilter));
    }

    if (selectedDepts.length > 0) {
      base = base.filter(t => {
        const deptId = t.departmentId?._id || t.departmentId;
        return deptId && selectedDepts.includes(deptId);
      });
    }

    if (selectedEmployeeIds.length > 0) {
      base = base.filter(t => {
        if (t.assignees && t.assignees.length > 0) {
          return t.assignees.some(emp => selectedEmployeeIds.includes(emp._id || emp));
        }
        if (t.assignedTo) {
          const assId = t.assignedTo._id || t.assignedTo;
          return selectedEmployeeIds.includes(assId);
        }
        return false;
      });
    }
    
    if (statusKey === "recurring") return base.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;
    
    base = base.filter(t => !t.isTemplate);
    if (!statusKey) return base.length;
    
    const target = normalizeStatusValue(statusKey);
    return base.filter(t => normalizeStatusValue(t.status || "") === target).length;
  };

  const getDateTabCount = (tabKey) => {
    const src = deadlineComingFilter ? [...myManagerTasks, ...teamTasks] : (activeTab === "myTasks" ? myManagerTasks : teamTasks);
    let base = src;
    if (deadlineComingFilter) {
      const seenIds = new Set();
      base = base.filter(t => {
        if (!t._id || seenIds.has(t._id.toString())) return false;
        seenIds.add(t._id.toString());
        return true;
      });
      base = base.filter(t => matchesDeadlineComingFilter(t, deadlineComingFilter));
    }

    base = base.filter(t => matchesDateFilter(t, tabKey));

    if (selectedDepts.length > 0) {
      base = base.filter(t => {
        const deptId = t.departmentId?._id || t.departmentId;
        return deptId && selectedDepts.includes(deptId);
      });
    }

    if (selectedEmployeeIds.length > 0) {
      base = base.filter(t => {
        if (t.assignees && t.assignees.length > 0) {
          return t.assignees.some(emp => selectedEmployeeIds.includes(emp._id || emp));
        }
        if (t.assignedTo) {
          const assId = t.assignedTo._id || t.assignedTo;
          return selectedEmployeeIds.includes(assId);
        }
        return false;
      });
    }

    if (taskFilter === "recurring") {
      base = base.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId);
    } else {
      base = base.filter(t => !t.isTemplate);
      if (taskFilter !== "") {
        const target = normalizeStatusValue(taskFilter);
        base = base.filter(t => normalizeStatusValue(t.status || "") === target);
      }
    }
    return base.length;
  };

  const STATUS_TABS = [
    { key: "", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_process", label: "In Process" },
    { key: "complete", label: "Complete" },
    { key: "overdue", label: "Overdue" },
    { key: "recurring", label: "Recurring" },
  ];

  const DATE_TABS = [
    { key: "all_time", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" }
  ];

  const isFilterActive = selectedDepts.length > 0 || selectedEmployeeIds.length > 0 || deadlineComingFilter !== "";

  return (
    <ManagerLayout
      navigation={navigation}
      title="Tasks"
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      showFilter={true}
      onFilterPress={() => setShowFilter(true)}
      filterActive={isFilterActive}
    >
      <View style={styles.container}>
        {/* List Content */}
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => item._id ? `task-${item._id}` : `task-fallback-${index}`}
          renderItem={renderItemFn}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          ListHeaderComponent={() => (
            <>
              {/* Stats Bar */}
              <LinearGradient colors={["#082B52", "#1268D9", "#1D7DF2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsHeader}>
                <View style={styles.statsRow}>
                  <View style={styles.statCell}>
                    <Text style={styles.statVal}>{stats.completeCount + stats.lateCompleteCount}</Text>
                    <Text style={styles.statLbl}>Finished</Text>
                  </View>
                  <View style={styles.statSep} />
                  <View style={styles.statCell}>
                    <Text style={[styles.statVal, { color: "#a5f3fc" }]}>{stats.inProcessCount + stats.rePendingCount}</Text>
                    <Text style={styles.statLbl}>Working</Text>
                  </View>
                  <View style={styles.statSep} />
                  <View style={styles.statCell}>
                    <Text style={[styles.statVal, { color: "#fca5a5" }]}>{stats.overdueCount}</Text>
                    <Text style={styles.statLbl}>Overdue</Text>
                  </View>
                  <View style={styles.statSep} />
                  <View style={styles.statCell}>
                    <Text style={[styles.statVal, { color: "#6ee7b7" }]}>{stats.progress}%</Text>
                    <Text style={styles.statLbl}>Progress</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Status filter tabs */}
              <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                  {STATUS_TABS.map((tab) => {
                    const isActive = taskFilter === tab.key;
                    const cnt = getStatusCount(tab.key);
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, isActive && styles.tabActive]}
                        onPress={() => setTaskFilter(tab.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                          {tab.label}
                        </Text>
                        <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                          <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                            {cnt}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Date filter tabs */}
              <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                  {DATE_TABS.map((df) => {
                    const isActive = dateFilter === df.key;
                    const cnt = getDateTabCount(df.key);
                    return (
                      <TouchableOpacity
                        key={df.key}
                        style={[styles.tab, isActive && styles.tabActive]}
                        onPress={() => setDateFilter(df.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                          {df.label}
                        </Text>
                        <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                          <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                            {cnt}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* My Tasks / Team Tasks Segmented Control - below date filter */}
              <View style={styles.segmentWrapper}>
                <View style={[styles.segmentContainer, { flex: 1 }]}>
                  <TouchableOpacity 
                    style={[styles.segmentBtn, activeTab === "myTasks" && styles.segmentActive]} 
                    onPress={() => {
                      setActiveTab("myTasks");
                      setDeadlineComingFilter("");
                    }}
                  >
                    <Text style={[styles.segmentText, activeTab === "myTasks" && styles.segmentTextActive]}>My Tasks</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.segmentBtn, activeTab === "teamTasks" && styles.segmentActive]} 
                    onPress={() => {
                      setActiveTab("teamTasks");
                      setDeadlineComingFilter("");
                    }}
                  >
                    <Text style={[styles.segmentText, activeTab === "teamTasks" && styles.segmentTextActive]}>Team Tasks</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Task List Header */}
              <View style={styles.listHeader}>
                <View style={styles.listHeaderLeft}>
                  <View style={styles.listHeaderAccent} />
                  <Text style={styles.listHeaderTitle}>
                    {taskFilter === "" ? "All Task List" : (STATUS_TABS.find((t) => t.key === taskFilter)?.label || "") + " Tasks"}
                  </Text>
                </View>
                <View style={styles.listHeaderRight}>
                  <Ionicons name="layers-outline" size={12} color="#94a3b8" />
                  <Text style={styles.listHeaderCount}>{filteredData.length} tasks</Text>
                </View>
              </View>
            </>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
          ListEmptyComponent={
            (!loadingTasks && !loadingProjects) ? (
              <View style={styles.emptyState}>
                <Ionicons name={activeTab === "projects" ? "briefcase-outline" : "albums-outline"} size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>{emptyMsg}</Text>
              </View>
            ) : (
              <ActivityIndicator style={{ marginTop: 40 }} color={TEAL} />
            )
          }
        />

        {/* ── Filter Modal ── */}
        <Modal
          visible={showFilter}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilter(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.filterModalContent, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Filter Tasks</Text>
                  <Text style={styles.modalSubtitle}>Refine the task list display</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFilter(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Department Section */}
                <Text style={styles.sectionLabel}>Department</Text>
                <View style={styles.chipsContainer}>
                  {[{ _id: "", name: "All Departments" }, ...departmentsList].map((d) => {
                    const isActive = d._id === "" ? selectedDepts.length === 0 : selectedDepts.includes(d._id);
                    return (
                      <TouchableOpacity
                        key={d._id || "all-dept"}
                        style={[styles.modalChip, isActive && styles.modalChipActive]}
                        onPress={() => toggleDeptSelection(d._id)}
                      >
                        <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Employee Section */}
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Employee / Assignee</Text>
                <View style={styles.chipsContainer}>
                  {(() => {
                    return [{ _id: "", firstName: "All Members", lastName: "" }, ...visibleEmployees].map((emp) => {
                      const empName = emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (emp.name || emp.fullName || "");
                      const isActive = emp._id === "" ? selectedEmployeeIds.length === 0 : selectedEmployeeIds.includes(emp._id);
                      return (
                        <TouchableOpacity
                          key={emp._id || "all-emp"}
                          style={[styles.modalChip, isActive && styles.modalChipActive]}
                          onPress={() => toggleEmployeeSelection(emp._id || "")}
                        >
                          <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                            {empName}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>

                {/* Deadline Options Section */}
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Task Deadline Type</Text>
                <View style={styles.chipsContainer}>
                  <TouchableOpacity
                    style={[styles.modalChip, deadlineComingFilter === "" && styles.modalChipActive]}
                    onPress={() => setDeadlineComingFilter("")}
                  >
                    <Text style={[styles.modalChipText, deadlineComingFilter === "" && styles.modalChipTextActive]}>
                      All Tasks
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalChip, deadlineComingFilter === "all" && styles.modalChipActive]}
                    onPress={() => setDeadlineComingFilter("all")}
                  >
                    <Text style={[styles.modalChipText, deadlineComingFilter === "all" && styles.modalChipTextActive]}>
                      All Deadline Coming
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalChip, deadlineComingFilter === "yesterday" && styles.modalChipActive]}
                    onPress={() => setDeadlineComingFilter("yesterday")}
                  >
                    <Text style={[styles.modalChipText, deadlineComingFilter === "yesterday" && styles.modalChipTextActive]}>
                      Yesterday
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalChip, deadlineComingFilter === "today" && styles.modalChipActive]}
                    onPress={() => setDeadlineComingFilter("today")}
                  >
                    <Text style={[styles.modalChipText, deadlineComingFilter === "today" && styles.modalChipTextActive]}>
                      Today
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalChip, deadlineComingFilter === "tomorrow" && styles.modalChipActive]}
                    onPress={() => setDeadlineComingFilter("tomorrow")}
                  >
                    <Text style={[styles.modalChipText, deadlineComingFilter === "tomorrow" && styles.modalChipTextActive]}>
                      Tomorrow
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => {
                    setSelectedDepts([]);
                    setSelectedEmployeeIds([]);
                    setDeadlineComingFilter("");
                    setShowFilter(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={() => setShowFilter(false)}
                >
                  <Text style={styles.saveBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Cancel Task Confirmation Modal ── */}
        <Modal
          visible={cancelModal.visible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCancelModal({ visible: false, task: null })}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(20, insets.bottom + 16) }}>
              
              {/* Warning Header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="warning-outline" size={22} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#1e293b" }}>Cancel Task?</Text>
                  <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "600", marginTop: 2 }}>⚠️ This action cannot be undone</Text>
                </View>
                <TouchableOpacity onPress={() => setCancelModal({ visible: false, task: null })}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Task Info */}
              {cancelModal.task && (
                <View style={{ backgroundColor: "#fff7f7", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#fecaca", marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#1e293b" }} numberOfLines={2}>
                    {cancelModal.task.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                    {cancelModal.task.departmentId?.name || "No Department"} • {cancelModal.task.endDateTime ? new Date(cancelModal.task.endDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date"}
                  </Text>
                </View>
              )}

              {/* Reason Input */}
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
                Reason for cancellation <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: cancelReason.trim() ? "#1268D9" : "#e2e8f0",
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  color: "#1e293b",
                  minHeight: 90,
                  textAlignVertical: "top",
                  backgroundColor: "#f8fafc",
                  marginBottom: 20,
                }}
                placeholder="Enter reason for cancelling this task..."
                placeholderTextColor="#94a3b8"
                multiline
                value={cancelReason}
                onChangeText={setCancelReason}
              />

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center" }}
                  onPress={() => setCancelModal({ visible: false, task: null })}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b" }}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: cancelLoading ? "#fca5a5" : "#ef4444", alignItems: "center" }}
                  onPress={handleCancelConfirm}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>Yes, Cancel Task</Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>

        <TaskActionModal
          visible={actionModalVisible}
          onClose={() => setActionModalVisible(false)}
          actionType={actionType}
          task={selectedTask}
          onSubmit={handleActionSubmit}
          loading={submittingAction}
        />

      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  
  segmentWrapper: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 1,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: TEAL_LIGHT,
    borderRadius: 20,
    padding: 3,
    width: "100%",
    maxWidth: 500,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 18,
  },
  segmentActive: {
    backgroundColor: TEAL,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },

  statsHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statSep: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  filterList: {
    flexGrow: 0,
  },
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    gap: 5,
    borderBottomColor: "#e2e8f0",
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    flexDirection: "row",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 4,
    gap: 4,
  },
  tabActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    minWidth: 20,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: "#ffffff",
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
  },
  tabBadgeTextActive: {
    color: TEAL,
  },

  // ── List Header ────────────────────────────────────────────────────────────
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  listHeaderAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#C2410C",
    marginRight: 7,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: 0.2,
  },
  listHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  listHeaderCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },

  listContent: {
    paddingBottom: 140,
  },
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 10,
    marginHorizontal: 8,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e8edf3",
    overflow: "hidden",
  },
  taskCardDone: {},
  taskCardTouchable: {
    flex: 1,
  },
  taskCardBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    paddingBottom: 10,
    gap: 10,
  },
  taskIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  taskTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.1,
  },
  taskTitleDone: {},
  taskMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 7,
  },
  taskMetaText: {
    fontSize: 10.5,
    color: "#94a3b8",
    fontWeight: "500",
    flexShrink: 1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#cbd5e1",
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  subtaskBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  subtaskBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  subtaskLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
    minWidth: 26,
    textAlign: "right",
  },
  taskRightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 40,
    flexShrink: 0,
  },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  taskDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 12,
  },
  taskActionStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusAndDelayWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  delayText: {
    fontSize: 10,
    fontWeight: "700",
  },
  delayTextOverdue: {
    color: "#ef4444",
  },
  delayTextLate: {
    color: "#ca8a04",
  },
  delayTextCompleted: {
    color: "#16a34a",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
  },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#ede9fe",
    borderRadius: 4,
    marginLeft: 4,
  },
  recurringBadgeText: {
    fontSize: 8.5,
    color: "#7c3aed",
    fontWeight: "700",
  },
  shiftedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#eff6ff",
    borderWidth: 0.5,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    marginLeft: 6,
  },
  shiftedBadgeText: {
    fontSize: 8.5,
    color: "#2563eb",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  modalBody: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  filterModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalChipActive: {
    backgroundColor: "#ccfbf1",
    borderColor: "#0d9488",
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalChipTextActive: {
    color: "#C2410C",
    fontWeight: "700",
  },
});

export default ManagerMyTasksScreen;
