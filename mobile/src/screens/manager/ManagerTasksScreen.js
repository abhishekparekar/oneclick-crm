import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Circle } from "react-native-svg";

import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import { getActiveTaskStatusesApi, submitFollowUpApi } from "../../api/taskService";
import { getMeApi } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import TaskActionModal from "../../components/TaskActionModal";

const TEAL = "#EA580C";

const STATUS_COLORS = {
  pending: { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1", label: "Pending" },
  re_pending: { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1", label: "Re-Pending" },
  in_process: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "In Process" },
  re_in_process: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "Re-In Process" },
  overdue: { bg: "#fef2f2", text: "#ef4444", border: "#fca5a5", label: "Overdue" },
  complete: { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0", label: "Completed" },
  late_complete: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", label: "Late Completed" },
  active: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "Active" },
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
  high: { text: "#ef4444", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", label: "High", icon: "flame-outline" },
  medium: { text: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", label: "Medium", icon: "alert-circle-outline" },
  low: { text: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", dot: "#10b981", label: "Low", icon: "checkmark-circle-outline" },
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

// ── Progress Ring Gauge for Banner Card ──────────────────────────────────────
const ProgressGauge = ({ percentage = 0 }) => {
  const radius = 26;
  const strokeWidth = 5.5;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (circumference * safePercentage) / 100;

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={70} height={70} viewBox="0 0 70 70">
        <Circle
          cx="35"
          cy="35"
          r={radius}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx="35"
          cy="35"
          r={radius}
          stroke="#FFFFFF"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 35 35)"
        />
      </Svg>
      <View style={styles.gaugeCenterOverlay}>
        <Text style={styles.gaugeValueText}>{safePercentage}%</Text>
        <Text style={styles.gaugeLabelText}>Progress</Text>
      </View>
    </View>
  );
};

// ── Task Card Component ──────────────────────────────────────────────────────
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

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 22 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22 }).start();

  let statusLabel = item.status?.replace(/_/g, " ") || "Pending";
  let statusColor = "#d97706";
  let statusBg = "#fffbeb";
  let statusBdr = "#fde68a";

  if (isDone) {
    if (item.status === "late_complete" || item.status === "re_late_complete") {
      statusLabel = "Late Completed";
      statusColor = "#d97706";
      statusBg = "#fffbeb";
      statusBdr = "#fde68a";
    } else {
      statusLabel = "Completed";
      statusColor = "#16a34a";
      statusBg = "#dcfce7";
      statusBdr = "#bbf7d0";
    }
  } else if (isOverdue) {
    statusLabel = "Overdue";
    statusColor = "#ef4444";
    statusBg = "#fef2f2";
    statusBdr = "#fca5a5";
  } else if (item.status === "in_process" || item.status === "re_in_process") {
    statusLabel = item.status === "re_in_process" ? "Re-In Process" : "In Process";
    statusColor = "#2563eb";
    statusBg = "#eff6ff";
    statusBdr = "#bfdbfe";
  } else if (item.status === "re_pending") {
    statusLabel = "Re-Pending";
    statusColor = "#7c3aed";
    statusBg = "#f5f3ff";
    statusBdr = "#ddd6fe";
  }

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

  let statusIconName = "ellipse-outline";
  let statusColorsArray = ["#64748b", "#475569"];

  if (isDone) {
    if (item.status === "late_complete" || item.status === "re_late_complete") {
      statusIconName = "warning";
      statusColorsArray = ["#f59e0b", "#d97706"];
    } else {
      statusIconName = "checkmark-circle";
      statusColorsArray = ["#10b981", "#059669"];
    }
  } else if (isOverdue) {
    statusIconName = "alert-circle";
    statusColorsArray = ["#ef4444", "#dc2626"];
  } else if (item.status === "in_process" || item.status === "re_in_process") {
    statusIconName = "play-circle";
    statusColorsArray = ["#3b82f6", "#2563eb"];
  } else if (item.status === "re_pending") {
    statusIconName = "repeat";
    statusColorsArray = ["#8b5cf6", "#7c3aed"];
  } else if (item.isTemplate) {
    statusIconName = "repeat";
    statusColorsArray = ["#8b5cf6", "#7c3aed"];
  }

  const isBothType = item.assignmentType === "both";
  const assigneeUser = item.assignedTo?.[0] || item.assignees?.[0];
  const assigneeName = assigneeUser?.firstName ? `${assigneeUser.firstName}` : (assigneeUser?.name || "abhi");
  const assigneeInitial = assigneeName.charAt(0).toUpperCase();

  return (
    <Animated.View style={[styles.taskCardContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.taskCardTouchable}
        onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerTaskDetails", params: { taskId: item._id } })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Top Header Row inside Card */}
        <View style={styles.cardMainRow}>
          {/* Status Icon Gradient Box */}
          <LinearGradient colors={statusColorsArray} style={styles.cardStatusIconBox}>
            <Ionicons name={statusIconName} size={22} color="#ffffff" />
          </LinearGradient>

          {/* Middle Details Column */}
          <View style={styles.cardContentCol}>
            {/* Title & Badges */}
            <View style={styles.cardTitleLine}>
              <Text style={styles.cardTitleText} numberOfLines={1}>
                {item.taskId ? `${item.taskId} - ${item.title}` : item.title}
              </Text>
              {item.isTemplate ? (
                <View style={[styles.badgePill, { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }]}>
                  <Ionicons name="repeat" size={10} color="#7c3aed" />
                  <Text style={[styles.badgePillText, { color: "#7c3aed" }]}>Template</Text>
                </View>
              ) : (item.isGeneratedFromTemplate || item.isRecurring || item.parentTemplateId) ? (
                <View style={[styles.badgePill, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                  <Ionicons name="repeat" size={10} color="#2563eb" />
                  <Text style={[styles.badgePillText, { color: "#2563eb" }]}>Recurring Task</Text>
                </View>
              ) : null}
            </View>

            {/* Department + Date Meta */}
            <View style={styles.cardMetaLine}>
              <Ionicons name="business-outline" size={12} color="#94a3b8" />
              <Text style={styles.cardMetaText} numberOfLines={1}>{deptName}</Text>
              <Text style={styles.cardMetaDot}>•</Text>
              <Ionicons name="calendar-outline" size={12} color={isOverdue ? "#ef4444" : "#94a3b8"} />
              <Text style={[styles.cardMetaText, isOverdue && { color: "#ef4444", fontWeight: "700" }]}>
                {endDate || startDate || "No date"}
              </Text>
            </View>

            {/* Subtask progress */}
            {subtasks.length > 0 && (
              <View style={styles.subtaskBarRow}>
                <View style={styles.subtaskTrack}>
                  <View
                    style={[
                      styles.subtaskFill,
                      {
                        width: `${Math.round((completedSub / subtasks.length) * 100)}%`,
                        backgroundColor: completedSub === subtasks.length ? "#10b981" : "#3b82f6",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.subtaskCountText}>{completedSub}/{subtasks.length}</Text>
              </View>
            )}
          </View>

          {/* Right Column: Priority Badge */}
          <View style={styles.cardRightCol}>
            <View style={[styles.priorityBadgePill, { backgroundColor: pConfig.bg, borderColor: pConfig.border }]}>
              <Text style={[styles.priorityBadgeText, { color: pConfig.text }]}>{pConfig.label}</Text>
            </View>
            {!isDone && (item.status === "pending" || item.status === "re_pending") && (
              <TouchableOpacity
                style={styles.quickStartBtn}
                onPress={() => handleStartTask(item)}
              >
                <Ionicons name="play" size={10} color="#ffffff" />
                <Text style={styles.quickStartText}>Start</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Strip (Rounded Inset Footer) */}
        <View style={styles.cardActionStrip}>
          {/* Status Chip & Delay text */}
          <View style={styles.actionLeftWrap}>
            <View style={[styles.statusTag, { backgroundColor: statusBg, borderColor: statusBdr }]}>
              <Ionicons
                name={
                  isOverdue
                    ? "alert-circle"
                    : isDone
                      ? item.status === "late_complete" || item.status === "re_late_complete"
                        ? "warning"
                        : "checkmark-circle"
                      : "ellipse"
                }
                size={12}
                color={statusColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {delayText ? (
              <Text style={[styles.delayDetailText, isOverdue ? { color: "#ef4444" } : isDone && item.status === "complete" ? { color: "#16a34a" } : { color: "#d97706" }]}>
                {delayText}
              </Text>
            ) : null}
          </View>

          {/* Right Section: Assignee + View + Cancel */}
          <View style={styles.actionRightWrap}>
            {isBothType && (
              <View style={styles.bothBadgePill}>
                <Text style={styles.bothBadgeText}>MYSELF & TEAM</Text>
              </View>
            )}
            <View style={styles.assigneeAvatarRow}>
              <View style={styles.assigneeAvatarCircle}>
                <Text style={styles.assigneeAvatarText}>{assigneeInitial}</Text>
              </View>
              <Text style={styles.assigneeNameText}>{assigneeName}</Text>
            </View>

            {/* View Button */}
            <TouchableOpacity
              style={styles.viewCardBtn}
              onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerTaskDetails", params: { taskId: item._id } })}
            >
              <Ionicons name="eye-outline" size={13} color="#475569" />
              <Text style={styles.viewCardBtnText}>View</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            {canCancel && !isDone && item.status !== "cancelled" && (
              <TouchableOpacity
                style={styles.cancelCardBtn}
                onPress={() => onCancel(item)}
              >
                <Ionicons name="close-circle-outline" size={13} color="#ef4444" />
                <Text style={styles.cancelCardBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main ManagerTasksScreen ──────────────────────────────────────────────────
const ManagerTasksScreen = ({ navigation, route }) => {
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

  const [activeTab, setActiveTab] = useState("myTasks");
  const [taskFilter, setTaskFilter] = useState("");
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

  const { user, hasPermission, updateUser } = useAuth();
  const canCancel = hasPermission("tasks", "cancel");
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showFilter, setShowFilter] = useState(false);

  const [cancelModal, setCancelModal] = useState({ visible: false, task: null });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

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
  const userFirstName = user?.firstName || user?.name?.split(" ")[0] || manager?.firstName || "Rameshwar";

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
      manager.accessibleDepartments.forEach((dept) => {
        if (!dept) return;
        const id = typeof dept === "object" ? dept?._id : dept;
        const name = typeof dept === "object" ? (dept?.name || "Accessible Dept") : "Accessible Dept";
        if (id && !list.some((x) => String(x?._id) === String(id))) {
          list.push({ _id: id, name });
        }
      });
    }
    return list;
  }, [manager]);

  const visibleEmployees = useMemo(() => {
    const list = teamData || [];
    const accessibleDeptIds = departmentsList.map((d) => d._id);

    let filtered = list.filter((emp) => {
      const empDeptId = emp.departmentId?._id || emp.departmentId;
      return empDeptId && accessibleDeptIds.includes(empDeptId);
    });

    if (selectedDepts.length > 0) {
      filtered = filtered.filter((emp) => {
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
      setSelectedDepts((prev) =>
        prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
      );
    }
  };

  const toggleEmployeeSelection = (empId) => {
    if (empId === "") {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds((prev) =>
        prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
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
        fetchTeam(true),
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
          attachments: data.attachments || [],
        });
      } else {
        const payload = {
          remarks: data.remarks,
          finalRemarks: data.remarks,
          attachments: data.attachments || [],
          nextFollowUpDate: data.nextFollowUpDate || null,
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
    let tasksToUse = deadlineComingFilter
      ? [...myManagerTasks, ...teamTasks]
      : activeTab === "myTasks"
      ? myManagerTasks
      : activeTab === "teamTasks"
      ? teamTasks
      : [];

    if (selectedDepts.length > 0) {
      tasksToUse = tasksToUse.filter((t) => {
        const deptId = t.departmentId?._id || t.departmentId;
        return deptId && selectedDepts.includes(deptId);
      });
    }

    if (selectedEmployeeIds.length > 0) {
      tasksToUse = tasksToUse.filter((t) => {
        if (t.assignees && t.assignees.length > 0) {
          return t.assignees.some((emp) => selectedEmployeeIds.includes(emp._id || emp));
        }
        if (t.assignedTo) {
          const assId = t.assignedTo._id || t.assignedTo;
          return selectedEmployeeIds.includes(assId);
        }
        return false;
      });
    }

    const completeCount = tasksToUse.filter((t) =>
      ["complete", "completed", "done"].includes(normalizeStatusValue(t.status))
    ).length;
    const lateCompleteCount = tasksToUse.filter(
      (t) =>
        normalizeStatusValue(t.status) === "late_complete" ||
        normalizeStatusValue(t.status) === "re_late_complete"
    ).length;
    const inProcessCount = tasksToUse.filter(
      (t) => normalizeStatusValue(t.status) === "in_process"
    ).length;
    const rePendingCount = tasksToUse.filter((t) =>
      ["re_pending", "re_in_process"].includes(normalizeStatusValue(t.status))
    ).length;
    const overdueCount = tasksToUse.filter(
      (t) =>
        normalizeStatusValue(t.status) === "overdue" ||
        (t.endDateTime &&
          new Date(t.endDateTime) < new Date() &&
          !["complete", "completed", "done", "late_complete", "re_late_complete"].includes(
            normalizeStatusValue(t.status)
          ))
    ).length;

    const totalActiveTasks = tasksToUse.filter((t) => !t.isTemplate).length;
    const totalTasksCount = tasksToUse.length;
    const finishedTasks = completeCount + lateCompleteCount;
    const progress =
      totalActiveTasks > 0 ? Math.round((finishedTasks / totalActiveTasks) * 100) : 0;

    return { totalTasksCount, completeCount, lateCompleteCount, inProcessCount, rePendingCount, overdueCount, progress };
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
        return (
          date.getFullYear() === targetDay.getFullYear() &&
          date.getMonth() === targetDay.getMonth() &&
          date.getDate() === targetDay.getDate()
        );
      };
      return (
        isSameDay(task.startDateTime || task.startDate) ||
        isSameDay(task.nextFollowUpDate) ||
        isSameDay(task.endDateTime || task.endDate)
      );
    };

    const checkRangeMatch = (startRange, endRange) => {
      const isBetween = (d) => {
        if (!d) return false;
        const date = new Date(d);
        return date >= startRange && date < endRange;
      };
      return (
        isBetween(task.startDateTime || task.startDate) ||
        isBetween(task.nextFollowUpDate) ||
        isBetween(task.endDateTime || task.endDate)
      );
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
        return (
          date.getFullYear() === targetDay.getFullYear() &&
          date.getMonth() === targetDay.getMonth() &&
          date.getDate() === targetDay.getDate()
        );
      };
      return (
        isSameDay(task.startDateTime || task.startDate) ||
        isSameDay(task.nextFollowUpDate) ||
        isSameDay(task.endDateTime || task.endDate)
      );
    };

    if (filterVal === "today") return checkDayMatch(today);
    if (filterVal === "tomorrow") return checkDayMatch(tomorrow);
    if (filterVal === "yesterday") return checkDayMatch(yesterday);
    if (filterVal === "today_tomorrow") return checkDayMatch(today) || checkDayMatch(tomorrow);
    return checkDayMatch(yesterday) || checkDayMatch(today) || checkDayMatch(tomorrow);
  };

  let filteredData = listData.filter((t) => matchesDateFilter(t, dateFilter));

  if (search.trim()) {
    const q = search.toLowerCase();
    filteredData = filteredData.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.taskId?.toLowerCase().includes(q)
    );
  }

  if (selectedDepts.length > 0) {
    filteredData = filteredData.filter((t) => {
      const deptId = t.departmentId?._id || t.departmentId;
      return deptId && selectedDepts.includes(deptId);
    });
  }

  if (selectedEmployeeIds.length > 0) {
    filteredData = filteredData.filter((t) => {
      if (t.assignees && t.assignees.length > 0) {
        return t.assignees.some((emp) => selectedEmployeeIds.includes(emp._id || emp));
      }
      if (t.assignedTo) {
        const assId = t.assignedTo._id || t.assignedTo;
        return selectedEmployeeIds.includes(assId);
      }
      return false;
    });
  }

  if (taskFilter === "recurring") {
    filteredData = filteredData.filter(
      (t) => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId
    );
  } else {
    filteredData = filteredData.filter((t) => !t.isTemplate);
    if (taskFilter !== "") {
      const target = normalizeStatusValue(taskFilter);
      filteredData = filteredData.filter((t) => normalizeStatusValue(t.status || "") === target);
    }
  }

  if (deadlineComingFilter) {
    filteredData = filteredData.filter((t) => matchesDeadlineComingFilter(t, deadlineComingFilter));
  }

  const seenIds = new Map();
  filteredData = filteredData.filter((t) => {
    if (!t._id || seenIds.has(t._id)) return false;
    seenIds.set(t._id, true);
    return true;
  });

  const getStatusCount = (statusKey) => {
    const src = deadlineComingFilter
      ? [...myManagerTasks, ...teamTasks]
      : activeTab === "myTasks"
      ? myManagerTasks
      : teamTasks;
    let base = src;
    if (deadlineComingFilter) {
      const seenIdsSet = new Set();
      base = base.filter((t) => {
        if (!t._id || seenIdsSet.has(t._id.toString())) return false;
        seenIdsSet.add(t._id.toString());
        return true;
      });
      base = base.filter((t) => matchesDeadlineComingFilter(t, deadlineComingFilter));
    } else {
      base = base.filter((t) => matchesDateFilter(t, dateFilter));
    }

    if (selectedDepts.length > 0) {
      base = base.filter((t) => {
        const deptId = t.departmentId?._id || t.departmentId;
        return deptId && selectedDepts.includes(deptId);
      });
    }

    if (selectedEmployeeIds.length > 0) {
      base = base.filter((t) => {
        if (t.assignees && t.assignees.length > 0) {
          return t.assignees.some((emp) => selectedEmployeeIds.includes(emp._id || emp));
        }
        if (t.assignedTo) {
          const assId = t.assignedTo._id || t.assignedTo;
          return selectedEmployeeIds.includes(assId);
        }
        return false;
      });
    }

    if (statusKey === "recurring")
      return base.filter(
        (t) => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId
      ).length;

    base = base.filter((t) => !t.isTemplate);
    if (!statusKey) return base.length;

    const target = normalizeStatusValue(statusKey);
    return base.filter((t) => normalizeStatusValue(t.status || "") === target).length;
  };

  const getDateTabCount = (tabKey) => {
    const src = deadlineComingFilter
      ? [...myManagerTasks, ...teamTasks]
      : activeTab === "myTasks"
      ? myManagerTasks
      : teamTasks;
    let base = src;
    if (deadlineComingFilter) {
      const seenIdsSet = new Set();
      base = base.filter((t) => {
        if (!t._id || seenIdsSet.has(t._id.toString())) return false;
        seenIdsSet.add(t._id.toString());
        return true;
      });
      base = base.filter((t) => matchesDeadlineComingFilter(t, deadlineComingFilter));
    }

    base = base.filter((t) => matchesDateFilter(t, tabKey));

    if (selectedDepts.length > 0) {
      base = base.filter((t) => {
        const deptId = t.departmentId?._id || t.departmentId;
        return deptId && selectedDepts.includes(deptId);
      });
    }

    if (selectedEmployeeIds.length > 0) {
      base = base.filter((t) => {
        if (t.assignees && t.assignees.length > 0) {
          return t.assignees.some((emp) => selectedEmployeeIds.includes(emp._id || emp));
        }
        if (t.assignedTo) {
          const assId = t.assignedTo._id || t.assignedTo;
          return selectedEmployeeIds.includes(assId);
        }
        return false;
      });
    }

    if (taskFilter === "recurring") {
      base = base.filter(
        (t) => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId
      );
    } else {
      base = base.filter((t) => !t.isTemplate);
      if (taskFilter !== "") {
        const target = normalizeStatusValue(taskFilter);
        base = base.filter((t) => normalizeStatusValue(t.status || "") === target);
      }
    }
    return base.length;
  };

  const STATUS_TABS = [
    { key: "", label: "All Tasks", icon: "grid-outline" },
    { key: "pending", label: "Pending", icon: "time-outline" },
    { key: "in_process", label: "In Process", icon: "sync-outline" },
    { key: "complete", label: "Completed", icon: "checkmark-circle-outline" },
    { key: "overdue", label: "Overdue", icon: "alert-circle-outline" },
    { key: "recurring", label: "Recurring", icon: "repeat-outline" },
  ];

  const DATE_TABS = [
    { key: "all_time", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
  ];

  const isFilterActive =
    selectedDepts.length > 0 || selectedEmployeeIds.length > 0 || deadlineComingFilter !== "";

  return (
    <ManagerLayout
      navigation={navigation}
      title="Tasks"
      subtitle="Manage your work efficiently"
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      showFilter={true}
      onFilterPress={() => setShowFilter(true)}
      filterActive={isFilterActive}
    >
      <View style={styles.screenWrapper}>
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => (item._id ? `task-${item._id}` : `task-fallback-${index}`)}
          renderItem={renderItemFn}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          ListHeaderComponent={() => (
            <>
              {/* ── Top Hero Section (Dark Navy Container + Orange Gradient Banner) ── */}
              <View style={styles.heroDarkContainer}>
                <LinearGradient
                  colors={["#FF5E00", "#EA580C", "#D97706"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroBannerCard}
                >
                  <Ionicons
                    name="disc-outline"
                    size={110}
                    color="rgba(255, 255, 255, 0.08)"
                    style={styles.bannerWatermark}
                  />

                  <View style={styles.heroBannerContent}>
                    {/* Left Circular Gauge */}
                    <ProgressGauge percentage={stats.progress} />

                    {/* Right Productivity Summary */}
                    <View style={styles.heroRightCol}>
                      <Text style={styles.bannerTitleText} numberOfLines={1}>
                        Keep going, {userFirstName}! 🔥
                      </Text>

                      {/* Slim horizontal progress line */}
                      <View style={styles.slimBarRow}>
                        <View style={styles.slimBarTrack}>
                          <View style={[styles.slimBarFill, { width: `${stats.progress}%` }]} />
                        </View>
                        <Text style={styles.slimBarPercentText}>{stats.progress}%</Text>
                      </View>

                      {/* Stats Row */}
                      <View style={styles.bannerStatsRow}>
                        <View style={styles.bannerStatCell}>
                          <Text style={styles.bannerStatNum}>{stats.totalTasksCount}</Text>
                          <Text style={styles.bannerStatLabel}>All Tasks</Text>
                        </View>
                        <View style={styles.bannerStatDivider} />
                        <View style={styles.bannerStatCell}>
                          <Text style={styles.bannerStatNum}>
                            {stats.completeCount + stats.lateCompleteCount}
                          </Text>
                          <Text style={styles.bannerStatLabel}>Completed</Text>
                        </View>
                        <View style={styles.bannerStatDivider} />
                        <View style={styles.bannerStatCell}>
                          <Text style={styles.bannerStatNum}>
                            {stats.inProcessCount + stats.rePendingCount}
                          </Text>
                          <Text style={styles.bannerStatLabel}>Working</Text>
                        </View>
                        <View style={styles.bannerStatDivider} />
                        <View style={styles.bannerStatCell}>
                          <Text style={styles.bannerStatNum}>{stats.overdueCount}</Text>
                          <Text style={styles.bannerStatLabel}>Overdue</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* ── Main Content Sheet (White Curved Background) ── */}
              <View style={styles.sheetContainer}>
                {/* 1. Status Filter Chips Row */}
                <View style={styles.chipsRowWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScrollContent}
                  >
                    {STATUS_TABS.map((tab) => {
                      const isActive = taskFilter === tab.key;
                      const cnt = getStatusCount(tab.key);
                      return (
                        <TouchableOpacity
                          key={tab.key || "all-status"}
                          style={[styles.statusChipBtn, isActive && styles.statusChipBtnActive]}
                          onPress={() => setTaskFilter(tab.key)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={tab.icon}
                            size={14}
                            color={isActive ? "#FF5E00" : "#64748b"}
                          />
                          <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                            {tab.label}
                          </Text>
                          <View style={[styles.statusChipBadge, isActive && styles.statusChipBadgeActive]}>
                            <Text style={[styles.statusChipBadgeText, isActive && styles.statusChipBadgeTextActive]}>
                              {cnt}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 2. Date Filter Chips Row */}
                <View style={styles.chipsRowWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScrollContent}
                  >
                    {DATE_TABS.map((df) => {
                      const isActive = dateFilter === df.key;
                      const cnt = getDateTabCount(df.key);
                      return (
                        <TouchableOpacity
                          key={df.key}
                          style={[styles.dateChipBtn, isActive && styles.dateChipBtnActive]}
                          onPress={() => setDateFilter(df.key)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={13}
                            color={isActive ? "#ffffff" : "#64748b"}
                          />
                          <Text style={[styles.dateChipText, isActive && styles.dateChipTextActive]}>
                            {df.label}
                          </Text>
                          <View style={[styles.dateChipBadge, isActive && styles.dateChipBadgeActive]}>
                            <Text style={[styles.dateChipBadgeText, isActive && styles.dateChipBadgeTextActive]}>
                              {cnt}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={styles.dateCalendarBtn}>
                      <Ionicons name="calendar" size={14} color="#64748b" />
                    </View>
                  </ScrollView>
                </View>

                {/* 3. My Tasks & Team Tasks Segment Control Bar (Zero unwanted gap/padding) */}
                <View style={styles.segmentBarWrapper}>
                  <View style={styles.segmentContainer}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, activeTab === "myTasks" && styles.segmentBtnActive]}
                      onPress={() => {
                        setActiveTab("myTasks");
                        setDeadlineComingFilter("");
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segmentText, activeTab === "myTasks" && styles.segmentTextActive]}>
                        My Tasks
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segmentBtn, activeTab === "teamTasks" && styles.segmentBtnActive]}
                      onPress={() => {
                        setActiveTab("teamTasks");
                        setDeadlineComingFilter("");
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segmentText, activeTab === "teamTasks" && styles.segmentTextActive]}>
                        Team Tasks
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Task List Sub-Header Row */}
                <View style={styles.listSubHeader}>
                  <Text style={styles.listSubHeaderTitle}>
                    {taskFilter === ""
                      ? "All Task List"
                      : (STATUS_TABS.find((t) => t.key === taskFilter)?.label || "") + " Tasks"}
                  </Text>
                  <View style={styles.listSubHeaderRight}>
                    <TouchableOpacity style={styles.sortBtn} activeOpacity={0.7}>
                      <Text style={styles.sortBtnText}>Sort: Latest</Text>
                      <Ionicons name="chevron-down" size={12} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.layoutToggleBtn} activeOpacity={0.7}>
                      <Ionicons name="options-outline" size={15} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </>
          )}
          contentContainerStyle={styles.listContentPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
          ListEmptyComponent={
            !loadingTasks && !loadingProjects ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons
                  name={activeTab === "projects" ? "briefcase-outline" : "albums-outline"}
                  size={48}
                  color="#cbd5e1"
                />
                <Text style={styles.emptyStateText}>{emptyMsg}</Text>
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
                    const isActive =
                      d._id === "" ? selectedDepts.length === 0 : selectedDepts.includes(d._id);
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
                  {[{ _id: "", firstName: "All Members", lastName: "" }, ...visibleEmployees].map(
                    (emp) => {
                      const empName = emp.firstName
                        ? `${emp.firstName} ${emp.lastName || ""}`.trim()
                        : emp.name || emp.fullName || "";
                      const isActive =
                        emp._id === ""
                          ? selectedEmployeeIds.length === 0
                          : selectedEmployeeIds.includes(emp._id);
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
                    }
                  )}
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
                <TouchableOpacity style={styles.saveBtn} onPress={() => setShowFilter(false)}>
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

              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 }}>
                Reason for cancellation <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                style={{
                  borderWidth: 1.5,
                  borderColor: cancelReason.trim() ? "#EA580C" : "#e2e8f0",
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

// ── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContentPadding: {
    paddingBottom: 130,
    backgroundColor: "#f8fafc",
  },

  // ── Hero Banner ────────────────────────────────────────────────────────────
  heroDarkContainer: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 6,
  },
  heroBannerCard: {
    borderRadius: 18,
    padding: 10,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#FF5E00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -20,
  },
  heroBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gaugeContainer: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gaugeCenterOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeValueText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  gaugeLabelText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: -2,
  },
  heroRightCol: {
    flex: 1,
  },
  bannerTitleText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 0,
    marginBottom: 4,
  },
  slimBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  slimBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 2,
    overflow: "hidden",
  },
  slimBarFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  slimBarPercentText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  bannerStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerStatCell: {
    alignItems: "flex-start",
  },
  bannerStatNum: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
  },
  bannerStatLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
  },
  bannerStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 5,
  },

  // ── Main Content Sheet ──────────────────────────────────────────────────────
  sheetContainer: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  chipsRowWrapper: {
    marginBottom: 6,
  },
  chipsScrollContent: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  // Status Chip
  statusChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 5,
  },
  statusChipBtnActive: {
    borderColor: "#FF5E00",
    backgroundColor: "#ffffff",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  statusChipTextActive: {
    color: "#0f172a",
  },
  statusChipBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statusChipBadgeActive: {
    backgroundColor: "#ef4444",
  },
  statusChipBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
  },
  statusChipBadgeTextActive: {
    color: "#ffffff",
  },

  // Date Chip
  dateChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 5,
  },
  dateChipBtnActive: {
    backgroundColor: "#FF5E00",
    borderColor: "#FF5E00",
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  dateChipTextActive: {
    color: "#ffffff",
  },
  dateChipBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dateChipBadgeActive: {
    backgroundColor: "#ffffff",
  },
  dateChipBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
  },
  dateChipBadgeTextActive: {
    color: "#FF5E00",
  },
  dateCalendarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  // My Tasks & Team Tasks Segment Control Bar
  segmentBarWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 20,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 18,
  },
  segmentBtnActive: {
    backgroundColor: "#FF5E00",
    shadowColor: "#FF5E00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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

  // Sub-Header Row
  listSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
  },
  listSubHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  listSubHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  layoutToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Task Card Styles ────────────────────────────────────────────────────────
  taskCardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 10,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  taskCardTouchable: {
    flex: 1,
  },
  cardMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
  },
  cardStatusIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContentCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardTitleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.1,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 8.5,
    fontWeight: "700",
  },
  cardMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 10.5,
    color: "#94a3b8",
    fontWeight: "500",
  },
  cardMetaDot: {
    fontSize: 10,
    color: "#cbd5e1",
  },
  subtaskBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  subtaskTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  subtaskFill: {
    height: "100%",
    borderRadius: 2,
  },
  subtaskCountText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
  },
  cardRightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priorityBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  quickStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  quickStartText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "700",
  },

  // Card Bottom Action Strip
  cardActionStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  actionLeftWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  delayDetailText: {
    fontSize: 10,
    fontWeight: "700",
  },
  actionRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bothBadgePill: {
    backgroundColor: "#f5f3ff",
    borderWidth: 0.5,
    borderColor: "#ddd6fe",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bothBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#7c3aed",
  },
  assigneeAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  assigneeAvatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeAvatarText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "800",
  },
  assigneeNameText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  viewCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  viewCardBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  cancelCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  cancelCardBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ef4444",
  },

  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
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
    backgroundColor: "#fff7ed",
    borderColor: "#EA580C",
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalChipTextActive: {
    color: "#EA580C",
    fontWeight: "700",
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
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});

export default ManagerTasksScreen;
