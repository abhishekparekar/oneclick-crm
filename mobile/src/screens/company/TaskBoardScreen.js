import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Animated,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import {
  getTasksApi,
  deleteTaskApi,
  updateTaskStatusApi,
  getDepartmentsApi,
  bulkShiftTasksApi,
} from "../../api/companyService";
import { getActiveTaskStatusesApi } from "../../api/taskService";
import { useAuth } from "../../context/AuthContext";
import { getEmployeesApi } from "../../api/employeeService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const normalizeStatusValue = (val) => {
  if (!val) return "";
  let s = val.toLowerCase().replace(/-/g, "_");
  if (s === "in_progress") return "in_process";
  if (s === "completed" || s === "done") return "complete";
  if (s === "late_completed") return "late_complete";
  return s;
};

// ─── Priority Config ─────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { text: "#ef4444", bg: "#ffffffff", border: "#fecaca", dot: "#ef4444", label: "High",   icon: "flame-outline" },
  medium: { text: "#f59e0b", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", label: "Medium", icon: "alert-circle-outline" },
  low:    { text: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", dot: "#10b981", label: "Low",    icon: "checkmark-circle-outline" },
};

const getPriorityConfig = (prio) =>
  PRIORITY_CONFIG[prio?.toLowerCase()] || PRIORITY_CONFIG.low;

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_process", label: "In Process" },
  { key: "complete", label: "Completed" },
  { key: "late_complete", label: "Late Completed" },
  { key: "re_open", label: "Re-Open" },
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

// Helper to format overdue/delay duration
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

// ─── Animated Task Card (Premium Redesign) ───────────────────────────────────
const TaskCard = ({ item, onPress, onEdit, onDelete, onToggle, isSelected, onSelect, canEdit = true, canCancel = true, canShift = true }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pConfig = getPriorityConfig(item.priority);
  
  const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(item.status?.toLowerCase());
  const isOverdue =
    item.endDateTime &&
    new Date(item.endDateTime) < new Date() &&
    !isDone;

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
  let statusColor = "#ca8a04"; // Yellow/Amber for Pending
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

  // Calculate late text if late complete
  let delayText = "";
  if (item.status === "late_complete" && item.delayedDuration) {
    const { days = 0, hours = 0 } = item.delayedDuration;
    delayText = `${days}d ${hours}h late`;
  } else if (isOverdue && item.endDateTime) {
    delayText = `${getDurationString(new Date(item.endDateTime), new Date())} overdue`;
  }

  // Status-based icon and colors for the left big icon box
  let statusIconName = "ellipse-outline";
  let statusColorsArray = ["#fef08a", "#ca8a04"]; // Yellow for Pending

  if (isDone) {
    if (item.status === "late_complete" || item.status === "re_late_complete") {
      statusIconName = "warning-outline";
      statusColorsArray = ["#fcd34d", "#d97706"]; // Amber
    } else {
      statusIconName = "checkmark-circle-outline";
      statusColorsArray = ["#6ee7b7", "#10b981"]; // Green
    }
  } else if (isOverdue) {
    statusIconName = "alert-circle-outline";
    statusColorsArray = ["#fca5a5", "#ef4444"]; // Red
  } else if (item.status === "in_process" || item.status === "re_in_process") {
    statusIconName = "play-circle-outline";
    statusColorsArray = ["#bfdbfe", "#2563eb"]; // Blue
  } else if (item.status === "re_pending") {
    statusIconName = "repeat-outline";
    statusColorsArray = ["#e9d5ff", "#7c3aed"]; // Purple
  }

  return (
    <Animated.View style={[styles.taskCard, isDone && styles.taskCardDone, isSelected && styles.taskCardSelected, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.taskCardTouchable}
        onPress={onPress}
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
                  <Ionicons name="time-outline" size={10} color={isOverdue ? "#ef4444" : "#94a3b8"} />
                  <Text style={[styles.taskMetaText, isOverdue && { color: "#ef4444" }]}>
                    {startDate}{endDate && endDate !== startDate ? ` – ${endDate}` : ""}
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

          {/* Right: priority badge + checkbox */}
          <View style={styles.taskRightCol}>
            <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg, borderColor: pConfig.border }]}>
              <Text style={[styles.priorityBadgeText, { color: pConfig.text }]}>{pConfig.label}</Text>
            </View>
            
            <TouchableOpacity style={styles.checkBox} onPress={onToggle}>
              {isDone ? (
                <LinearGradient colors={["#10b981", "#059669"]} style={styles.checkBoxChecked}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.checkBoxEmpty} />
              )}
            </TouchableOpacity>
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
                size={14}
                color={statusColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {delayText ? (
              <Text style={[styles.delayText, isOverdue ? styles.delayTextOverdue : styles.delayTextLate]}>
                {delayText}
              </Text>
            ) : null}
          </View>

          {/* Actions */}
          {(canEdit || canCancel) ? (
            <View style={styles.taskActions}>
              {canEdit && (
                <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
                  <Ionicons name="pencil-outline" size={12} color="#475569" />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
              {canEdit && canCancel && <View style={styles.actionSep} />}
              {canCancel && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onDelete}>
                  <Ionicons name="trash-outline" size={12} color="#ef4444" />
                  <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const TaskBoardScreen = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  const isHR = user?.role === "HR";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isBulkShiftOpen, setIsBulkShiftOpen] = useState(false);
  const [tempNewAssignee, setTempNewAssignee] = useState("");
  const [bulkShiftReason, setBulkShiftReason] = useState("");
  const [bulkShifting, setBulkShifting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
    const [dateFilter, setDateFilter] = useState("today"); // Date period filter inside collapsible panel
  const [showFilter, setShowFilter] = useState(false);
  const [taskFilter, setTaskFilter] = useState(""); // "" = All
  const [deadlineComingFilter, setDeadlineComingFilter] = useState("");

  const toggleFilter = () => {
    setShowFilter(!showFilter);
  };

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

  const handleClearFilters = () => {
    setSelectedDepts([]);
    setSelectedEmployeeIds([]);
    setDeadlineComingFilter("");
  };

  useEffect(() => {
    setSelectedTaskIds([]);
  }, [selectedDepts, selectedEmployeeIds, taskFilter, deadlineComingFilter, dateFilter]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const { data: tasksData = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["companyTasks"],
    queryFn: async () => {
      const [taskRes, recurringRes] = await Promise.all([
        getTasksApi().catch(() => ({ data: { tasks: [] } })),
        getTasksApi({ isTemplate: true }).catch(() => ({ data: { tasks: [] } })),
      ]);
      let all = [...(taskRes.data?.tasks || [])];
      const templates = (recurringRes.data?.tasks || []).map((t) => ({ ...t, isTemplate: true }));
      return [...all, ...templates];
    },
    staleTime: 0,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["companyDepartments"],
    queryFn: async () => {
      const res = await getDepartmentsApi().catch(() => ({ data: { departments: [] } }));
      return res.data?.departments || [];
    },
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["companyEmployees"],
    queryFn: async () => {
      const res = await getEmployeesApi().catch(() => ({ data: { employees: [] } }));
      return res.data?.employees || res.data || [];
    },
    staleTime: 60000,
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleMoveStatus = async (id, newStatus) => {
    try {
      await updateTaskStatusApi(id, newStatus);
      queryClient.invalidateQueries(["companyTasks"]);
      queryClient.invalidateQueries(["companyDashboard"]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Task", "This action cannot be undone. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTaskApi(id);
            queryClient.invalidateQueries(["companyTasks"]);
            queryClient.invalidateQueries(["companyDashboard"]);
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Deletion failed");
          }
        },
      },
    ]);
  };

  const handleBulkShiftSubmit = async () => {
    if (!tempNewAssignee || !bulkShiftReason) {
      Alert.alert("Required Fields", "Please select an assignee and enter a shifting reason.");
      return;
    }
    try {
      setBulkShifting(true);
      await bulkShiftTasksApi({
        taskIds: selectedTaskIds,
        assignedTo: [tempNewAssignee],
        shiftReason: bulkShiftReason,
      });
      Alert.alert("Success", `${selectedTaskIds.length} tasks shifted successfully.`);
      setSelectedTaskIds([]);
      setTempNewAssignee("");
      setBulkShiftReason("");
      setIsBulkShiftOpen(false);
      queryClient.invalidateQueries(["companyTasks"]);
      queryClient.invalidateQueries(["companyDashboard"]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to bulk shift tasks");
    } finally {
      setBulkShifting(false);
    }
  };

  // ── Metrics Calculation (7 Flow Categories) ──────────────────────────────────
  const tasksList = Array.isArray(tasksData) ? tasksData : [];
  const projTasks = tasksList.filter((t) => {
    if (t.isTemplate) return false;
    const matchDept = selectedDepts.length === 0 || selectedDepts.includes(t.departmentId?._id || t.departmentId);
    const matchEmployee = selectedEmployeeIds.length === 0 || t.assignedTo?.some(a => selectedEmployeeIds.includes(a._id || a));
    return matchDept && matchEmployee;
  });

  const pendingCount = projTasks.filter((t) => t.status === "pending").length;
  const inProcessCount = projTasks.filter((t) => t.status === "in_process").length;
  
  const completeCount = projTasks.filter((t) => ["complete", "completed", "done"].includes(t.status)).length;
  
  const overdueCount = projTasks.filter(
    (t) => (t.status === "overdue" || (t.endDateTime && new Date(t.endDateTime) < new Date() && !["complete", "completed", "done", "late_complete", "re_late_complete"].includes(t.status)))
  ).length;

  const lateCompleteCount = projTasks.filter((t) => t.status === "late_complete" || t.status === "re_late_complete").length;
  const reOpenCount = projTasks.filter((t) => t.reopenCount > 0).length;
  const rePendingCount = projTasks.filter((t) => ["re_pending", "re_in_process"].includes(t.status)).length;

  const totalActiveTasks = projTasks.length;
  const finishedTasks = completeCount + lateCompleteCount;
  const progress = totalActiveTasks > 0 ? Math.round((finishedTasks / totalActiveTasks) * 100) : 0;

  // ── Date Filters Helper ──────────────────────────────────────────────────────
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
    const startOfAfterNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const candidateDates = [];
    if (task.startDateTime) candidateDates.push(new Date(task.startDateTime));
    if (task.startDate) candidateDates.push(new Date(task.startDate));
    if (task.nextFollowUpDate) candidateDates.push(new Date(task.nextFollowUpDate));
    if (task.endDateTime) candidateDates.push(new Date(task.endDateTime));
    if (task.endDate) candidateDates.push(new Date(task.endDate));

    if (candidateDates.length === 0 && task.createdAt) {
      candidateDates.push(new Date(task.createdAt));
    }

    const checkSingleDate = (d) => {
      const day = startOfDay(d);
      switch (tabKey) {
        case "today":
          return day.getTime() === today.getTime();
        case "yesterday":
          return day.getTime() === yesterday.getTime();
        case "this_week":
          return d >= startOfWeek && d < endOfWeek;
        case "last_month":
          return d >= startOfLastMonth && d < startOfThisMonth;
        case "this_month":
          return d >= startOfThisMonth && d < startOfNextMonth;
        case "next_month":
          return d >= startOfNextMonth && d < startOfAfterNextMonth;
        default:
          return true;
      }
    };

    return candidateDates.some(checkSingleDate);
  };

  // ── Status Tabs List ───────────────────────────────────────────────────────
  
  // ── Date Filters List inside collapsible panel ──────────────────────────────
  const dateFilters = [
    { key: "all_time", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "next_month", label: "Next Month" },
    { key: "re_open", label: "Re-Open" },
  ];

  // ── Filtered List ───────────────────────────────────────────────────────────
  let filteredData = tasksData;

  if (search.trim() !== "") {
    const q = search.toLowerCase();
    filteredData = filteredData.filter((t) => {
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchId = t.taskId?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchId;
    });
  }

  if (dateFilter && dateFilter !== "all_time") {
    filteredData = filteredData.filter((t) => matchesDateFilter(t, dateFilter));
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
    filteredData = filteredData.filter((t) => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId);
  } else if (taskFilter === "overdue") {
    filteredData = filteredData.filter((t) => {
      const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(t.status?.toLowerCase());
      return !t.isTemplate && t.endDateTime && new Date(t.endDateTime) < new Date() && !isDone;
    });
  } else if (taskFilter === "pending") {
    filteredData = filteredData.filter((t) => {
      if (t.isTemplate) return false;
      const s = normalizeStatusValue(t.status || "");
      return s === "pending" || s === "todo" || s === "re_pending" || !s;
    });
  } else if (taskFilter === "in_process") {
    filteredData = filteredData.filter((t) => {
      if (t.isTemplate) return false;
      const s = normalizeStatusValue(t.status || "");
      return s === "in_process" || s === "in_progress" || s === "working" || s === "re_in_process";
    });
  } else if (taskFilter === "complete") {
    filteredData = filteredData.filter((t) => {
      if (t.isTemplate) return false;
      const s = normalizeStatusValue(t.status || "");
      return s === "complete" || s === "completed" || s === "done" || s === "re_complete";
    });
  } else if (taskFilter === "late_complete") {
    filteredData = filteredData.filter((t) => {
      if (t.isTemplate) return false;
      const s = normalizeStatusValue(t.status || "");
      return s === "late_complete" || s === "re_late_complete" || s === "late_completed";
    });
  } else if (taskFilter === "re_open") {
    filteredData = filteredData.filter((t) => {
      if (t.isTemplate) return false;
      return t.reopenCount > 0 || ["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes(t.status?.toLowerCase());
    });
  } else if (taskFilter !== "") {
    const target = normalizeStatusValue(taskFilter);
    filteredData = filteredData.filter((t) => normalizeStatusValue(t.status || "") === target);
  }

  if (deadlineComingFilter) {
    filteredData = filteredData.filter((t) => matchesDeadlineComingFilter(t, deadlineComingFilter));
  }

  // Deduplicate by _id
  const seenIds = new Map();
  filteredData = filteredData.filter((t) => {
    if (!t._id || seenIds.has(t._id)) return false;
    seenIds.set(t._id, true);
    return true;
  });

  const getStatusCount = (statusKey) => {
    let base = tasksData;
    if (deadlineComingFilter) {
      const seen = new Set();
      base = base.filter(t => {
        if (!t._id || seen.has(t._id.toString())) return false;
        seen.add(t._id.toString());
        return true;
      });
      base = base.filter(t => matchesDeadlineComingFilter(t, deadlineComingFilter));
    } else if (dateFilter && dateFilter !== "all_time") {
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
    
    if (statusKey === "recurring") {
      return base.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;
    }
    if (statusKey === "overdue") {
      return base.filter(t => {
        const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(t.status?.toLowerCase());
        return !t.isTemplate && t.endDateTime && new Date(t.endDateTime) < new Date() && !isDone;
      }).length;
    }
    if (statusKey === "pending") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "pending" || s === "todo" || s === "re_pending" || !s;
      }).length;
    }
    if (statusKey === "in_process") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "in_process" || s === "in_progress" || s === "working" || s === "re_in_process";
      }).length;
    }
    if (statusKey === "complete") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "complete" || s === "completed" || s === "done" || s === "re_complete";
      }).length;
    }
    if (statusKey === "late_complete") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "late_complete" || s === "re_late_complete" || s === "late_completed";
      }).length;
    }
    if (statusKey === "re_open") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        return t.reopenCount > 0 || ["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes(t.status?.toLowerCase());
      }).length;
    }
    
    // When statusKey is "" ("All"), return all tasks including recurring
    if (!statusKey) return base.length;
    
    const target = normalizeStatusValue(statusKey);
    return base.filter(t => normalizeStatusValue(t.status || "") === target).length;
  };

  const getDateTabCount = (tabKey) => {
    let base = tasksData;
    if (deadlineComingFilter) {
      const seen = new Set();
      base = base.filter(t => {
        if (!t._id || seen.has(t._id.toString())) return false;
        seen.add(t._id.toString());
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
      return base.filter(t => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;
    }
    if (taskFilter === "overdue") {
      return base.filter(t => {
        const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(t.status?.toLowerCase());
        return !t.isTemplate && t.endDateTime && new Date(t.endDateTime) < new Date() && !isDone;
      }).length;
    }
    if (taskFilter === "pending") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "pending" || s === "todo" || s === "re_pending" || !s;
      }).length;
    }
    if (taskFilter === "in_process") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "in_process" || s === "in_progress" || s === "working" || s === "re_in_process";
      }).length;
    }
    if (taskFilter === "complete") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "complete" || s === "completed" || s === "done" || s === "re_complete";
      }).length;
    }
    if (taskFilter === "late_complete") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        const s = normalizeStatusValue(t.status || "");
        return s === "late_complete" || s === "re_late_complete" || s === "late_completed";
      }).length;
    }
    if (taskFilter === "re_open") {
      return base.filter(t => {
        if (t.isTemplate) return false;
        return t.reopenCount > 0 || ["re_pending", "re_in_process", "re_complete", "re_late_complete"].includes(t.status?.toLowerCase());
      }).length;
    }
    if (taskFilter !== "") {
      const target = normalizeStatusValue(taskFilter);
      return base.filter(t => normalizeStatusValue(t.status || "") === target).length;
    }
    return base.length;
  };

  const isFilterActive = selectedDepts.length > 0 || selectedEmployeeIds.length > 0 || deadlineComingFilter !== "";


  const renderTaskItem = useCallback(({ item }) => {
    return (
      <View style={{ paddingHorizontal: 12 }}>
        <TaskCard
          key={item._id}
          item={item}
          onPress={() => {
            if (selectedEmployeeIds.length > 0) {
              const visibleIds = filteredData.map((t) => t._id).filter(Boolean);
              const isAnySelected = visibleIds.some((id) => selectedTaskIds.includes(id));
              if (isAnySelected) {
                setSelectedTaskIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
              } else {
                setSelectedTaskIds((prev) => [...new Set([...prev, ...visibleIds])]);
              }
            } else {
              navigation.navigate(isHR ? "HRTaskDetails" : "CompanyTaskDetails", { taskId: item._id, initialTask: item });
            }
          }}
          onEdit={() => navigation.navigate(isHR ? "HRCreateTask" : "CompanyCreateTask", { editingTask: item })}
          onDelete={() => handleDelete(item._id)}
          isSelected={selectedTaskIds.includes(item._id)}
          onToggle={() => {
            const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete"].includes(
              item.status?.toLowerCase()
            );
            const isOverdue = item.endDateTime && new Date(item.endDateTime) < new Date() && !isDone;

            let nextStatus = "completed";
            if (isDone) {
              nextStatus = "todo";
            } else if (isOverdue) {
              nextStatus = "late_complete";
            }
            handleMoveStatus(item._id, nextStatus);
          }}
          canEdit={hasPermission("tasks", "edit")}
          canCancel={hasPermission("tasks", "cancel")}
          canShift={hasPermission("tasks", "shift")}
        />
      </View>
    );
  }, [selectedEmployeeIds, filteredData, selectedTaskIds, navigation, hasPermission]);

  const renderListHeader = useCallback(() => (
    <View>
      {/* ── Gradient Stats Header ─────────────────────────────────────── */}
      <LinearGradient
        colors={['#082B52', '#1268D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.statsHeader}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: "#FFFFFF" }]}>{totalActiveTasks}</Text>
            <Text style={styles.statLbl}>All Tasks</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: "#6EE7B7" }]}>{completeCount + lateCompleteCount}</Text>
            <Text style={styles.statLbl}>Finished</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: "#93C5FD" }]}>{inProcessCount + rePendingCount}</Text>
            <Text style={styles.statLbl}>Working</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: "#FCA5A5" }]}>{overdueCount}</Text>
            <Text style={styles.statLbl}>Overdue</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: "#FDE047" }]}>{progress}%</Text>
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

      {/* ── Date Filter Tabs (Moved below status) ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {dateFilters.map((df) => {
            const isActive = dateFilter === df.key;
            const cnt = getDateTabCount(df.key);
            return (
              <TouchableOpacity
                key={df.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setDateFilter(df.key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{df.label}</Text>
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{cnt}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Active Filter Indicators Bar ── */}
      {isFilterActive && (
        <View style={styles.activeFilterBanner}>
          <View style={styles.activeFilterLeft}>
            <Ionicons name="funnel" size={13} color="#1268D9" />
            <Text style={styles.activeFilterBannerText}>
              Filters active ({selectedDepts.length + selectedEmployeeIds.length + (deadlineComingFilter ? 1 : 0)})
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClearFilters}
            style={styles.clearFiltersBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 3 }} />
            <Text style={styles.clearFiltersBtnText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Task List Header ──────────────────────────────────────────── */}
      <View style={styles.listHeader}>
        <View style={styles.listHeaderLeft}>
          <View style={styles.listHeaderAccent} />
          <Text style={styles.listHeaderTitle}>
            {taskFilter === "" ? "All Task List" : `${STATUS_TABS.find(t => t.key === taskFilter)?.label || ""} Tasks`}
          </Text>
        </View>
        <View style={styles.listHeaderRight}>
          <TouchableOpacity
            onPress={toggleFilter}
            style={[
              styles.listFilterBtn,
              isFilterActive && styles.listFilterBtnActive
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFilterActive ? "funnel" : "funnel-outline"}
              size={13}
              color={isFilterActive ? "#FFFFFF" : "#1268D9"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.listFilterBtnText, isFilterActive && styles.listFilterBtnTextActive]}>
              {isFilterActive ? "Filtered" : "Filter"}
            </Text>
          </TouchableOpacity>
          <Ionicons name="layers-outline" size={12} color="#94a3b8" />
          <Text style={styles.listHeaderCount}>{filteredData.length} tasks</Text>
        </View>
      </View>
    </View>
  ), [
    totalActiveTasks, completeCount, lateCompleteCount, inProcessCount, rePendingCount, overdueCount, progress,
    taskFilter, dateFilter, isFilterActive, selectedDepts, selectedEmployeeIds, deadlineComingFilter, filteredData.length
  ]);

  const renderEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading tasks…</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <LinearGradient colors={["#f0fdf4", "#ecfdf5"]} style={styles.emptyIcon}>
          <Ionicons name="checkmark-done-outline" size={28} color="#10b981" />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No matching tasks</Text>
        <Text style={styles.emptySubtitle}>Try changing status filters or date tabs</Text>
      </View>
    );
  }, [isLoading]);

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Tasks"
      hideBottomNav={isHR}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search tasks..."
      headerTitle="Task Board"
      headerRightElement={
        <TouchableOpacity 
          onPress={toggleFilter} 
          style={[
            styles.headerFilterBtn,
            isFilterActive && styles.headerFilterBtnActive
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFilterActive ? "funnel" : "funnel-outline"}
            size={20}
            color={isFilterActive ? "#FFFFFF" : "#0F172A"}
          />
          {isFilterActive && (
            <View style={styles.headerFilterDot} />
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.root}>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={renderTaskItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0d9488" />}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyComponent}
        />

        {/* ── FAB Add Task ─────────────────────────────────────────────────── */}
        {hasPermission("tasks", "create") && (
          <View style={[styles.fabContainer, { bottom: Math.max(20, insets.bottom + 20) }]}>
            <TouchableOpacity
              style={styles.fabSecondary}
              onPress={() => navigation.navigate("CompanyCreateTask", { isRecurring: true })}
              activeOpacity={0.85}
            >
              <Ionicons name="repeat-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => navigation.navigate("CompanyCreateTask")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#082B52', '#1268D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bulk Actions Banner ── */}
        {hasPermission("tasks", "shift") && selectedTaskIds.length > 0 && (
          <View style={styles.bulkBanner}>
            <Text style={styles.bulkText}>{selectedTaskIds.length} Selected</Text>
            <View style={styles.bulkActionsRow}>
              <TouchableOpacity 
                style={styles.bulkShiftBtn} 
                onPress={() => setIsBulkShiftOpen(true)}
              >
                <Text style={styles.bulkShiftBtnText}>Bulk Shift</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.bulkCancelBtn} 
                onPress={() => setSelectedTaskIds([])}
              >
                <Text style={styles.bulkCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Bulk Shift Modal ── */}
        <Modal
          visible={isBulkShiftOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsBulkShiftOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Bulk Shift Tasks ({selectedTaskIds.length})</Text>
                  <Text style={styles.modalSubtitle}>Reassign selected tasks to another member</Text>
                </View>
                <TouchableOpacity onPress={() => setIsBulkShiftOpen(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>Select New Assignee</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  {employees.map((emp) => {
                    const empName = emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (emp.name || "");
                    return (
                      <TouchableOpacity
                        key={emp._id}
                        style={[styles.deptChip, tempNewAssignee === emp._id && styles.deptChipActive]}
                        onPress={() => setTempNewAssignee(emp._id)}
                      >
                        <Text style={[styles.deptChipText, tempNewAssignee === emp._id && styles.deptChipTextActive]}>
                          {empName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Reason for Shifting</Text>
                <View style={styles.textAreaContainer}>
                  <TextInput
                    multiline
                    numberOfLines={4}
                    value={bulkShiftReason}
                    onChangeText={setBulkShiftReason}
                    placeholder="Why are these tasks being reassigned?"
                    style={styles.textArea}
                    placeholderTextColor="#94a3b8"
                  />
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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsBulkShiftOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveBtn, (!tempNewAssignee || !bulkShiftReason) && { opacity: 0.5 }]} 
                  onPress={handleBulkShiftSubmit}
                  disabled={!tempNewAssignee || !bulkShiftReason || bulkShifting}
                >
                  {bulkShifting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Shift Tasks</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
                  {[{ _id: "", name: "All Departments" }, ...departments].map((d) => {
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
                    // Filter employees belonging to the selected departments
                    const visibleEmployees = selectedDepts.length === 0
                      ? employees
                      : employees.filter(emp => selectedDepts.includes(emp.departmentId?._id || emp.departmentId));

                    return [{ _id: "", firstName: "All Members", lastName: "" }, ...visibleEmployees].map((emp) => {
                      const empName = emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : (emp.name || "");
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
      </View>
    </CompanyAdminLayout>
  );
};


// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  dateTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "transparent",
    marginRight: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateTabActive: {
    backgroundColor: "#ecfeff",
    borderColor: "#06b6d4",
  },
  dateTabText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  dateTabTextActive: {
    color: "#0891b2",
    fontWeight: "700",
  },
  dateTabBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  dateTabBadgeActive: {
    backgroundColor: "#cffafe",
  },
  dateTabBadgeText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  dateTabBadgeTextActive: {
    color: "#0891b2",
  },

  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 140,
  },
  statusOverview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  statusChip: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusChipCount: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusChipCountActive: {
    color: "#ffffff",
  },
  statusChipLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  statusChipLabelActive: {
    color: "#ecfdf5",
  },

  // Header filter toggle
  filterToggleBtn: {
    padding: 8,
    marginRight: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Stats Header ──────────────────────────────────────────────────────────
  statsHeader: {
    paddingVertical: 14,
    paddingHorizontal: 8,
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
    height: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  // ── Dept Filter ───────────────────────────────────────────────────────────
  filterPanel: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  filterRowLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    flexDirection: "row",
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 6,
  },
  deptChipActive: {
    backgroundColor: "#ccfbf1",
    borderColor: "#5eead4",
  },
  deptChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  deptChipTextActive: {
    color: "#C2410C",
  },

  // ── Task Dashboard Summary ───────────────────────────────────────────────
  dashboardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dashboardTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearFilterBtn: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  clearFilterBtnText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#ef4444",
  },
  stackedBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  stackedBar: {
    flex: 1,
    flexDirection: "row",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricCard: {
    width: "32%",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 4,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
    flex: 1,
  },
  metricCount: {
    fontSize: 14,
    fontWeight: "800",
  },

  statsHeader: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    elevation: 3,
    shadowColor: "#082B52",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  statLbl: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  statSep: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  // ── Tabs (Date Periods) ──────────────────────────────────────────────────
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginTop: 1,
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 6,
    gap: 5,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    minWidth: 18,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  tabBadgeTextActive: {
    color: "#ffffff",
  },

  // ── Header & List Filter Button Styles ──
  headerFilterBtn: {
    padding: 6,
    marginRight: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerFilterBtnActive: {
    backgroundColor: "#1268D9",
  },
  headerFilterDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  listFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  listFilterBtnActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  listFilterBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1268D9",
  },
  listFilterBtnTextActive: {
    color: "#FFFFFF",
  },
  activeFilterBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  activeFilterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeFilterBannerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E40AF",
  },
  clearFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearFiltersBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },

  // ── List Header ───────────────────────────────────────────────────────────
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
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
    backgroundColor: COLORS.primary,
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
    color: "#94a3b8",
    fontWeight: "600",
  },

  // ── Task List Container ───────────────────────────────────────────────────
  taskListContainer: {
    paddingHorizontal: 12,
  },

  // ── Task Card ─────────────────────────────────────────────────────────────
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 10,
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
  taskCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: "rgba(18, 104, 217, 0.06)",
  },
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
  selectCheckbox: {
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
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
  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#ede9fe",
    borderRadius: 4,
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
  checkBox: {},
  checkBoxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  checkBoxChecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  actionBtnDanger: {},
  actionSep: {
    width: 1,
    height: 14,
    backgroundColor: "#e2e8f0",
  },

  // ── Loading / Empty ───────────────────────────────────────────────────────
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fabSecondary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#082B52",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Bulk Banner Styles ──
  bulkBanner: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 16,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  bulkText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  bulkActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulkShiftBtn: {
    backgroundColor: "#0d9488",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bulkShiftBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  bulkCancelBtn: {
    backgroundColor: "#475569",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bulkCancelBtnText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: "80%",
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
  textAreaContainer: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  textArea: {
    fontSize: 13,
    color: "#1e293b",
    minHeight: 80,
    textAlignVertical: "top",
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

export default TaskBoardScreen;
