import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TaskActionModal from "../../components/TaskActionModal";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import EmployeeLayout from "../../components/EmployeeLayout";
import { getEmployeeTasksApi, getActiveTaskStatusesApi, updateTaskStatusApi, submitFollowUpApi } from "../../api/taskService";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import { useSocket } from "../../hooks/useSocket";

// ─── Priority Config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { text: "#ef4444", bg: "#fff1f1", border: "#fecaca", label: "High" },
  medium: { text: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "Medium" },
  low:    { text: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", label: "Low" },
};

const getPriorityConfig = (prio) =>
  PRIORITY_CONFIG[prio?.toLowerCase()] || PRIORITY_CONFIG.low;

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

// Helper: compute effective deadline for recurring tasks
// For daily recurring tasks → today's date with the template's time
// No longer computing fake deadlines for templates since we only show actual generated tasks
// with real startDateTime and endDateTime from the cron job.

const normalizeStatusValue = (val) => {
  if (!val) return "";
  let s = val.toLowerCase().replace(/-/g, "_");
  if (s === "todo" || s === "pending") return "pending";
  if (s === "in_progress" || s === "in_process") return "in_process";
  if (s === "completed" || s === "done" || s === "complete") return "complete";
  if (s === "late_completed" || s === "late_complete") return "late_complete";
  if (s === "re_pending") return "re_pending";
  if (s === "re_in_process" || s === "re_in_progress") return "re_in_process";
  if (s === "re_complete" || s === "re_completed") return "re_complete";
  if (s === "re_late_complete" || s === "re_late_completed") return "re_late_complete";
  return s;
};

// ─── Task Card (Exact same design as Company TaskBoardScreen) ─────────────────
const TaskCard = ({ item, onPress, onStatusUpdate, canCancel, onCancel }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pConfig = getPriorityConfig(item.priority);

  const isDone = ["complete", "completed", "done", "late_complete", "re_late_complete", "re_complete", "re_completed"].includes(item.status?.toLowerCase());
  const effectiveEndDate = item.endDateTime ? new Date(item.endDateTime) : null;
  const isOverdue =
    effectiveEndDate &&
    effectiveEndDate < new Date() &&
    !isDone &&
    !item.isTemplate;

  let deptName = item.departmentId?.name;
  if (!deptName && item.assignees && item.assignees.length > 0) {
    const assignee = item.assignees[0];
    if (assignee.departmentName) {
      deptName = assignee.departmentName;
    } else if (assignee.departmentId?.name) {
      deptName = assignee.departmentId.name;
    } else if (assignee.departmentIds && assignee.departmentIds.length > 0) {
      deptName = assignee.departmentIds.map(d => d.name || "Dept").join(", ");
    }
  }
  if (!deptName) deptName = "No Department";

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
  } else if (isDone && item.status === "complete" && item.endDateTime) {
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

  // Determine left border color accent line
  let leftStripeColor = "#F97316";
  if (isOverdue) leftStripeColor = "#EF4444";
  else if (isDone) leftStripeColor = "#10B981";
  else if (deptName?.toLowerCase().includes("it")) leftStripeColor = "#8B5CF6";

  return (
    <Animated.View style={[styles.taskCard, isDone && styles.taskCardDone, { borderLeftColor: leftStripeColor, borderLeftWidth: 4, transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.taskCardTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* ── Card Body ── */}
        <View style={styles.taskCardBody}>
          {/* Left: status-based icon box */}
          {isOverdue ? (
            <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.taskIconBoxCircle}>
              <Ionicons name="alert-circle" size={20} color="#ffffff" />
            </LinearGradient>
          ) : deptName?.toLowerCase().includes("it") ? (
            <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={styles.taskIconBoxSquare}>
              <Ionicons name="document-text-outline" size={18} color="#ffffff" />
            </LinearGradient>
          ) : (
            <LinearGradient colors={statusColorsArray} style={styles.taskIconBoxCircle}>
              <Ionicons name={statusIconName} size={18} color="#ffffff" />
            </LinearGradient>
          )}

          {/* Center & Top: text content */}
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
                <View style={[styles.recurringBadge, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
                  <Ionicons name="repeat-outline" size={10} color="#7C3AED" />
                  <Text style={[styles.recurringBadgeText, { color: "#7C3AED" }]}>Recurring</Text>
                </View>
              ) : (item.isGeneratedFromTemplate || item.isRecurring || item.parentTemplateId) ? (
                <View style={[styles.recurringBadge, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <Ionicons name="repeat-outline" size={10} color="#3B82F6" />
                  <Text style={[styles.recurringBadgeText, { color: "#3B82F6" }]}>Recurring</Text>
                </View>
              ) : null}
            </View>

            {/* Dept + Date + Time meta line */}
            <View style={styles.taskMetaLine}>
              <Ionicons name="briefcase-outline" size={12} color="#94A3B8" />
              <Text style={styles.taskMetaText} numberOfLines={1}>{deptName}</Text>

              {(startDate || endDate) && (
                <>
                  <View style={styles.metaDot} />
                  <Ionicons name="calendar-outline" size={12} color={isOverdue ? "#EF4444" : "#94A3B8"} />
                  <Text style={[styles.taskMetaText, isOverdue && { color: "#EF4444", fontWeight: "700" }]}>
                    {endDate || startDate}
                  </Text>
                </>
              )}

              {item.endDateTime && (
                <>
                  <View style={styles.metaDot} />
                  <Ionicons name="time-outline" size={12} color="#94A3B8" />
                  <Text style={styles.taskMetaText}>
                    {new Date(item.endDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Right Priority Badge */}
          <View style={styles.taskRightCol}>
            <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg, borderColor: pConfig.border }]}>
              <Text style={[styles.priorityBadgeText, { color: pConfig.text }]}>{pConfig.label}</Text>
            </View>
          </View>
        </View>

        {/* ── Footer / Action Strip ── */}
        <View style={styles.taskActionStrip}>
          {/* Status chip & overdue duration */}
          <View style={styles.statusAndDelayWrap}>
            <View style={[styles.statusChip, { backgroundColor: statusBg, borderColor: statusBdr }]}>
              <Ionicons
                name={
                  isOverdue
                    ? "time-outline"
                    : isDone
                    ? "checkmark-circle-outline"
                    : "time-outline"
                }
                size={12}
                color={statusColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            {delayText ? (
              <Text style={[styles.delayText, isOverdue ? styles.delayTextOverdue : isDone && item.status === "complete" ? styles.delayTextCompleted : styles.delayTextLate]}>
                {delayText}
              </Text>
            ) : null}
          </View>

          {/* Action Buttons: Start / Late Complete + View */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!isDone && (
              <TouchableOpacity
                style={[
                  styles.quickActionBtn,
                  { backgroundColor: isOverdue ? "#FF5B00" : (normalizeStatusValue(item.status) === "pending" || normalizeStatusValue(item.status) === "re_pending" ? "#2563EB" : "#10B981") }
                ]}
                onPress={() => onStatusUpdate(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isOverdue ? "warning" : (normalizeStatusValue(item.status) === "pending" || normalizeStatusValue(item.status) === "re_pending" ? "play" : "checkmark")}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.quickActionText}>
                  {isOverdue ? "Late Complete" : (normalizeStatusValue(item.status) === "pending" || normalizeStatusValue(item.status) === "re_pending" ? "Start" : "Complete")}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
              <Ionicons name="eye-outline" size={14} color="#64748B" />
              <Text style={styles.actionBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyTasksScreen({ route, navigation }) {
  const { user, hasPermission } = useAuth();
  const { socket } = useSocket(user?.companyId);

  const [allTasks, setAllTasks] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState(route?.params?.status || "");
  const [activeDateFilter, setActiveDateFilter] = useState(route?.params?.dateFilter || "All Time");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deadlineComingFilter, setDeadlineComingFilter] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);

  const { employeeDashboard } = useAppData();
  const employee = employeeDashboard?.employee || {};

  const departmentsList = useMemo(() => {
    const list = [];
    if (employee?.departmentId) {
      const dId = typeof employee.departmentId === "object" ? employee.departmentId?._id : employee.departmentId;
      const dName = typeof employee.departmentId === "object" ? (employee.departmentId?.name || "My Department") : "My Department";
      if (dId) {
        list.push({ _id: dId, name: dName });
      }
    }
    
    const addDepts = (deptArray) => {
      if (Array.isArray(deptArray) && deptArray.length > 0) {
        deptArray.forEach(d => {
          if (!d) return;
          const id = typeof d === "object" ? d?._id : d;
          const name = typeof d === "object" ? (d?.name || "Accessible Dept") : "Accessible Dept";
          if (id && !list.some(x => String(x?._id) === String(id))) {
            list.push({ _id: id, name });
          }
        });
      }
    };

    addDepts(employee?.departmentIds);
    addDepts(employee?.accessibleDepartments);

    return list;
  }, [employee]);

  const canCancel = hasPermission("tasks", "cancel");
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
      const res = await updateTaskStatusApi(cancelModal.task._id, "cancel", cancelReason);
      if (res.data && res.data.success) {
        setCancelModal({ visible: false, task: null });
        setCancelReason("");
        fetchTasks(false);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to cancel task. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    if (route?.params?.status) {
      setActiveStatus(route.params.status);
      setActiveDateFilter("All Time");
    }
    if (route?.params?.departmentId) {
      setSelectedDepts([route.params.departmentId]);
    } else if (route?.params?.departmentId === "") {
      setSelectedDepts([]);
    }
  }, [route?.params]);

  const isFetchingRef = useRef(false);
  const hasFetchedStatusesRef = useRef(false);

  const fetchTasks = async (showLoading = true) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (showLoading) setLoading(true);
      const params = {};
      if (selectedPriority) params.priority = selectedPriority;

      const promises = [
        getEmployeeTasksApi(params).catch(() => ({ data: { tasks: [], success: false } })),
      ];

      if (!hasFetchedStatusesRef.current && taskStatuses.length === 0) {
        promises.push(getActiveTaskStatusesApi().catch(() => ({ data: { statuses: [], success: false } })));
      }

      const results = await Promise.all(promises);
      const resTasks = results[0];
      const resStatuses = results[1];

      if (resTasks?.data?.success) {
        setAllTasks(resTasks.data.tasks || []);
      }

      if (resStatuses?.data?.success) {
        hasFetchedStatusesRef.current = true;
        setTaskStatuses(resStatuses.data.statuses || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [selectedPriority])
  );

  // ── Date matching helper (must be defined before displayedTasks) ──────────
  const matchesDateFilter = (t, dateTab) => {
    if (dateTab === "All Time") return true;
    const now = new Date();
    const formatDate = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const todayStr = formatDate(now);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // Recurring (template) tasks: always show in Today / This Week / This Month / All Time
    if (t.isTemplate) {
      if (dateTab === "All Time") return true;
      if (dateTab === "Today") return true;
      if (dateTab === "This Week") return true;
      if (dateTab === "This Month") return true;
      return false; // not in Yesterday / Last Month
    }

    const checkDayMatch = (targetDayStr) => {
      const formatDateStr = (d) => {
        if (!d) return null;
        const date = new Date(d);
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
      };
      return formatDateStr(t.startDateTime || t.startDate) === targetDayStr ||
             formatDateStr(t.nextFollowUpDate) === targetDayStr ||
             formatDateStr(t.endDateTime || t.endDate) === targetDayStr;
    };

    const checkRangeMatch = (startRange, endRange) => {
      const isBetween = (d) => {
        if (!d) return false;
        const date = new Date(d);
        // Normalize time for range check
        date.setHours(0, 0, 0, 0);
        const s = new Date(startRange); s.setHours(0, 0, 0, 0);
        const e = new Date(endRange); e.setHours(23, 59, 59, 999);
        return date >= s && date <= e;
      };
      return isBetween(t.startDateTime || t.startDate) ||
             isBetween(t.nextFollowUpDate) ||
             isBetween(t.endDateTime || t.endDate);
    };

    switch (dateTab) {
      case "Today": return checkDayMatch(todayStr);
      case "Yesterday": return checkDayMatch(yesterdayStr);
      case "This Week": {
        const first = now.getDate() - now.getDay();
        const s = new Date(now); s.setDate(first);
        const e = new Date(now); e.setDate(first + 6);
        return checkRangeMatch(s, e);
      }
      case "This Month": {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return checkRangeMatch(startOfThisMonth, startOfNextMonth);
      }
      case "Last Month": {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lme = new Date(now.getFullYear(), now.getMonth(), 0);
        return checkRangeMatch(lm, lme);
      }
      default: return true;
    }
  };

  const matchesDeadlineComingFilter = (t, filterVal) => {
    if (!filterVal) return true;
    if (t.isTemplate) return false;
    
    const now = new Date();
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const checkDayMatch = (targetDay) => {
      const isSameDay = (d) => {
        if (!d) return false;
        const date = new Date(d);
        return date.getFullYear() === targetDay.getFullYear() &&
               date.getMonth() === targetDay.getMonth() &&
               date.getDate() === targetDay.getDate();
      };
      return isSameDay(t.startDateTime || t.startDate) ||
             isSameDay(t.nextFollowUpDate) ||
             isSameDay(t.endDateTime || t.endDate);
    };

    if (filterVal === "today") return checkDayMatch(today);
    if (filterVal === "tomorrow") return checkDayMatch(tomorrow);
    if (filterVal === "yesterday") return checkDayMatch(yesterday);
    if (filterVal === "today_tomorrow") return checkDayMatch(today) || checkDayMatch(tomorrow);
    // "all"
    return checkDayMatch(yesterday) || checkDayMatch(today) || checkDayMatch(tomorrow);
  };

  const displayedTasks = useMemo(() => {
    let tasks = allTasks;
    if (searchQuery) {
      tasks = tasks.filter(
        (t) =>
          t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.taskId || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDepts.length > 0) {
      tasks = tasks.filter((t) => {
        const dId = typeof t.departmentId === "object" ? t.departmentId?._id : t.departmentId;
        return dId && selectedDepts.includes(dId.toString());
      });
    }

    if (activeStatus === "recurring") {
      tasks = tasks.filter((t) => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId);
    } else {
      tasks = tasks.filter((t) => !t.isTemplate);
    }

    if (activeStatus === "recurring") return tasks.filter((t) => matchesDateFilter(t, activeDateFilter));
    // "All" tab: show regular tasks filtered by date
    if (!activeStatus) return tasks.filter((t) => matchesDateFilter(t, activeDateFilter));
    const target = normalizeStatusValue(activeStatus);
    
    const checkTargetMatch = (taskStatus, tgt) => {
      const s = normalizeStatusValue(taskStatus);
      if (tgt === "pending") return s === "pending" || s === "re_pending";
      if (tgt === "in_process") return s === "in_process" || s === "re_in_process";
      if (tgt === "complete") return ["complete", "late_complete", "re_complete", "re_late_complete"].includes(s);
      return s === tgt;
    };

    let filtered = tasks.filter((t) => checkTargetMatch(t.status || "", target));

    if (deadlineComingFilter) {
      filtered = filtered.filter((t) => matchesDeadlineComingFilter(t, deadlineComingFilter));
    } else {
      filtered = filtered.filter((t) => matchesDateFilter(t, activeDateFilter));
    }

    return filtered;
  }, [allTasks, activeStatus, searchQuery, activeDateFilter, deadlineComingFilter, selectedDepts]);

  const getStatusCount = (tabValue) => {
    const checkTargetMatch = (taskStatus, tgt) => {
      const s = normalizeStatusValue(taskStatus);
      if (tgt === "pending") return s === "pending" || s === "re_pending";
      if (tgt === "in_process") return s === "in_process" || s === "re_in_process";
      if (tgt === "complete") return ["complete", "late_complete", "re_complete", "re_late_complete"].includes(s);
      return s === tgt;
    };

    let base = allTasks;
    if (selectedDepts.length > 0) {
      base = base.filter((t) => {
        const dId = typeof t.departmentId === "object" ? t.departmentId?._id : t.departmentId;
        return dId && selectedDepts.includes(dId.toString());
      });
    }
    if (deadlineComingFilter) {
      base = base.filter((t) => matchesDeadlineComingFilter(t, deadlineComingFilter));
    } else {
      base = base.filter((t) => matchesDateFilter(t, activeDateFilter));
    }

    if (tabValue === "recurring") return base.filter((t) => t.isTemplate || t.isRecurring || t.isGeneratedFromTemplate || t.parentTemplateId).length;
    
    base = base.filter((t) => !t.isTemplate);
    if (!tabValue) return base.length;
    
    const target = normalizeStatusValue(tabValue);
    return base.filter((t) => checkTargetMatch(t.status || "", target)).length;
  };

  const getDateTabCount = (dateTab) => {
    let base = allTasks;
    if (selectedDepts.length > 0) {
      base = base.filter((t) => {
        const dId = typeof t.departmentId === "object" ? t.departmentId?._id : t.departmentId;
        return dId && selectedDepts.includes(dId.toString());
      });
    }
    base = base.filter((t) => !t.isTemplate);
    return base.filter((t) => matchesDateFilter(t, dateTab)).length;
  };


  const stats = useMemo(() => {
    let baseTasks = allTasks.filter((t) => !t.isTemplate);

    if (selectedDepts.length > 0) {
      baseTasks = baseTasks.filter((t) => {
        const dId = typeof t.departmentId === "object" ? t.departmentId?._id : t.departmentId;
        return dId && selectedDepts.includes(dId.toString());
      });
    }

    const totalActiveTasks = baseTasks.length;

    const finishedTasks = baseTasks.filter((t) =>
      ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes(normalizeStatusValue(t.status))
    ).length;

    const inProcessCount = baseTasks.filter((t) =>
      ["in_process", "re_in_process"].includes(normalizeStatusValue(t.status))
    ).length;

    const pendingCount = baseTasks.filter((t) =>
      ["pending", "re_pending", "todo"].includes(normalizeStatusValue(t.status)) &&
      !(t.endDateTime && new Date(t.endDateTime) < new Date())
    ).length;

    const overdueCount = baseTasks.filter((t) => {
      const s = normalizeStatusValue(t.status);
      const isDone = ["complete", "completed", "done", "late_complete", "re_complete", "re_late_complete"].includes(s);
      return s === "overdue" || (t.endDateTime && new Date(t.endDateTime) < new Date() && !isDone);
    }).length;

    const progress = totalActiveTasks > 0 ? Math.round((finishedTasks / totalActiveTasks) * 100) : 0;

    return {
      totalActiveTasks,
      finishedTasks,
      inProcessCount,
      pendingCount,
      overdueCount,
      progress,
    };
  }, [allTasks, selectedDepts]);

  useEffect(() => {
    if (socket) {
      const handleTaskUpdate = () => { fetchTasks(false); };
      socket.on(`taskCreated_${user?.companyId}`, handleTaskUpdate);
      socket.on(`taskUpdated_${user?.companyId}`, handleTaskUpdate);
      return () => {
        socket.off(`taskCreated_${user?.companyId}`, handleTaskUpdate);
        socket.off(`taskUpdated_${user?.companyId}`, handleTaskUpdate);
      };
    }
  }, [socket, user?.companyId]);

  const handleQuickAction = (task) => {
    let action = "in_process";
    if (task.status === "in_process" || task.status === "re_in_process") {
      const isOverdueActive = task.status === "overdue" || (task.endDateTime && new Date(task.endDateTime) < new Date());
      if (task.status === "re_in_process") {
        action = isOverdueActive ? "re_late_complete" : "re_complete";
      } else {
        action = isOverdueActive ? "late_complete" : "complete";
      }
    } else if (task.status === "re_pending") {
      action = "re_in_process";
    }
    
    setSelectedTask(task);
    setActionType(action);
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

        const res = await updateTaskStatusApi(selectedTask._id, actionType.replace('re_', ''), payload);
      }
      setActionModalVisible(false);
      fetchTasks(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err?.response?.data?.message || "Failed to update task status.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchTasks(false); };

  const STATUS_TABS = [
    { key: "", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_process", label: "In Process" },
    { key: "complete", label: "Completed" },
    { key: "overdue", label: "Overdue" },
    { key: "recurring", label: "Recurring" },
  ];

  const DATE_TABS = ["All Time", "Today", "Yesterday", "This Week", "This Month", "Last Month"];

  return (
    <EmployeeLayout
      navigation={navigation}
      title="My Tasks"
      rightActionType="tasks"
      onRightActionPress={{
        onFilter: () => setShowFilters((prev) => !prev),
        filterActive: selectedPriority !== "",
        onPlus: hasPermission("tasks", "create") ? () => navigation.navigate("EmployeeCreateTask") : undefined,
      }}
    >
      <View style={styles.root}>
        <FlatList
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1268D9" colors={["#1268D9"]} />
          }
          data={displayedTasks}
          keyExtractor={(task) => task._id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={() => (
            <>
              {/* ── Today's Progress Active Shift Blue Hero Card ── */}
              <LinearGradient
                colors={["#082B52", "#1268D9", "#1D7DF2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  {/* Left: Circular Progress Ring */}
                  <View style={styles.progressCircleWrap}>
                    <View style={styles.progressCircleOuter}>
                      <Text style={styles.progressValue}>{stats.progress}%</Text>
                      <Text style={styles.progressLabel}>Progress</Text>
                    </View>
                  </View>

                  {/* Middle: Title, Subtitle, Progress Bar Track */}
                  <View style={styles.heroMiddleContent}>
                    <Text style={styles.heroTitle}>Today's Progress</Text>
                    <Text style={styles.heroSubtitle}>Keep going, you're doing great! 🚀</Text>
                    <View style={styles.heroProgressTrack}>
                      <View style={[styles.heroProgressBar, { width: `${Math.max(5, stats.progress)}%` }]} />
                    </View>
                  </View>

                  {/* Right: Target Graphic */}
                  <View style={styles.heroTargetWrap}>
                    <View style={styles.targetIconCircle}>
                      <Ionicons name="location" size={24} color="#FFFFFF" />
                    </View>
                  </View>
                </View>

                {/* Bottom Stats Row: 4 Compact Metric Cells */}
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatCell}>
                    <View style={[styles.heroStatIconBox, { backgroundColor: "#10B981" }]}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroStatTextGroup}>
                      <Text style={styles.heroStatNum}>{stats.finishedTasks}</Text>
                      <Text style={styles.heroStatName}>Finished</Text>
                    </View>
                  </View>

                  <View style={styles.heroStatCell}>
                    <View style={[styles.heroStatIconBox, { backgroundColor: "#3B82F6" }]}>
                      <Ionicons name="sync" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroStatTextGroup}>
                      <Text style={styles.heroStatNum}>{stats.inProcessCount}</Text>
                      <Text style={styles.heroStatName}>Working</Text>
                    </View>
                  </View>

                  <View style={styles.heroStatCell}>
                    <View style={[styles.heroStatIconBox, { backgroundColor: "#EF4444" }]}>
                      <Ionicons name="time" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroStatTextGroup}>
                      <Text style={styles.heroStatNum}>{stats.overdueCount}</Text>
                      <Text style={styles.heroStatName}>Overdue</Text>
                    </View>
                  </View>

                  <View style={styles.heroStatCell}>
                    <View style={[styles.heroStatIconBox, { backgroundColor: "#1268D9" }]}>
                      <Ionicons name="trending-up" size={12} color="#FFFFFF" />
                    </View>
                    <View style={styles.heroStatTextGroup}>
                      <Text style={styles.heroStatNum}>{stats.totalActiveTasks}</Text>
                      <Text style={styles.heroStatName}>Total Tasks</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* ── Status Pill Filter Tabs ── */}
              <View style={styles.statusTabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                  {STATUS_TABS.map((tab) => {
                    const isActive = activeStatus === tab.key;
                    const cnt = getStatusCount(tab.key);
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.statusPillTab, isActive && styles.statusPillTabActive]}
                        onPress={() => setActiveStatus(tab.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>{tab.label}</Text>
                        <View style={[styles.statusPillBadge, isActive && styles.statusPillBadgeActive]}>
                          <Text style={[styles.statusPillBadgeText, isActive && styles.statusPillBadgeTextActive]}>{cnt}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Date Tabs ── */}
              <View style={styles.dateTabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateTabsScroll}>
                  {DATE_TABS.map((dateTab) => {
                    const isActive = activeDateFilter === dateTab;
                    return (
                      <TouchableOpacity
                        key={dateTab}
                        style={[styles.dateTabItem, isActive && styles.dateTabItemActive]}
                        onPress={() => setActiveDateFilter(dateTab)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar-outline" size={14} color={isActive ? "#1268D9" : "#64748B"} style={{ marginRight: 5 }} />
                        <Text style={[styles.dateTabText, isActive && styles.dateTabTextActive]}>{dateTab}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Search & Sort Control Bar ── */}
              <View style={styles.searchSectionRow}>
                <View style={styles.searchBarBox}>
                  <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tasks..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Sort Pill Dropdown */}
                <TouchableOpacity style={styles.sortPillBtn} activeOpacity={0.7}>
                  <Text style={styles.sortPillText}>Sort: Latest</Text>
                  <Ionicons name="chevron-down" size={12} color="#64748B" style={{ marginLeft: 3 }} />
                </TouchableOpacity>

                {/* Filter button */}
                <TouchableOpacity
                  style={[
                    styles.filterToggleBtn,
                    (selectedPriority !== "" || deadlineComingFilter !== "") && { backgroundColor: "#1268D9", borderColor: "#1268D9" }
                  ]}
                  onPress={() => setShowFilters(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={(selectedPriority !== "" || deadlineComingFilter !== "") ? "options" : "options-outline"}
                    size={18}
                    color={(selectedPriority !== "" || deadlineComingFilter !== "") ? "#FFFFFF" : "#64748B"}
                  />
                </TouchableOpacity>
              </View>

              {/* ── Section Header with Accent Bar & View Toggle ── */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionAccentLine} />
                  <Text style={styles.sectionTitleText}>
                    All Tasks ({displayedTasks.length})
                  </Text>
                </View>
                <View style={styles.viewToggleRow}>
                  <TouchableOpacity style={styles.viewToggleBtnActive} activeOpacity={0.7}>
                    <Ionicons name="list" size={16} color="#1268D9" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viewToggleBtn} activeOpacity={0.7}>
                    <Ionicons name="grid-outline" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          renderItem={({ item }) => (
            <TaskCard
              item={item}
              onPress={() => navigation.navigate("EmployeeTaskDetails", { taskId: item._id })}
              onStatusUpdate={handleQuickAction}
              canCancel={canCancel}
              onCancel={handleCancelPress}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#0d9488" />
                <Text style={styles.loadingText}>Loading tasks…</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <LinearGradient colors={["#f0fdf4", "#ecfdf5"]} style={styles.emptyIcon}>
                  <Ionicons name="checkmark-done-outline" size={28} color="#10b981" />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No tasks found</Text>
                <Text style={styles.emptySubtitle}>You are all caught up in this section!</Text>
              </View>
            )
          }
        />

        {/* ── Removed redundant FAB ── */}
      </View>

        {/* ── Filter Modal ── */}
        <Modal
          visible={showFilters}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Filter Tasks</Text>
                  <Text style={styles.modalSubtitle}>Refine the task list display</Text>
                </View>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Department Options Section */}
                {departmentsList.length > 1 && (
                  <>
                    <Text style={styles.sectionLabel}>Departments</Text>
                    <View style={styles.chipsContainer}>
                      <TouchableOpacity
                        style={[styles.modalChip, selectedDepts.length === 0 && styles.modalChipActive]}
                        onPress={() => setSelectedDepts([])}
                      >
                        <Text style={[styles.modalChipText, selectedDepts.length === 0 && styles.modalChipTextActive]}>
                          All Departments
                        </Text>
                      </TouchableOpacity>
                      {departmentsList.map((dept) => {
                        const isActive = selectedDepts.includes(dept._id.toString());
                        return (
                          <TouchableOpacity
                            key={dept._id}
                            style={[styles.modalChip, isActive && styles.modalChipActive]}
                            onPress={() => {
                              setSelectedDepts(prev => {
                                if (isActive) return prev.filter(id => id !== dept._id.toString());
                                return [...prev, dept._id.toString()];
                              });
                            }}
                          >
                            <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                              {dept.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Priority Options Section */}
                <Text style={styles.sectionLabel}>Priority</Text>
                <View style={styles.chipsContainer}>
                  {["", "low", "medium", "high"].map((prio) => {
                    const isActive = selectedPriority === prio;
                    return (
                      <TouchableOpacity
                        key={prio}
                        style={[styles.modalChip, isActive && styles.modalChipActive]}
                        onPress={() => setSelectedPriority(prio)}
                      >
                        <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>
                          {prio === "" ? "All Priorities" : prio.charAt(0).toUpperCase() + prio.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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
                    style={[styles.modalChip, deadlineComingFilter === "today_tomorrow" && styles.modalChipActive]}
                    onPress={() => setDeadlineComingFilter("today_tomorrow")}
                  >
                    <Text style={[styles.modalChipText, deadlineComingFilter === "today_tomorrow" && styles.modalChipTextActive]}>
                      Today & Tomorrow
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
                    setSelectedPriority("");
                    setDeadlineComingFilter("");
                    setSelectedDepts([]);
                    setShowFilters(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={styles.saveBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      <TaskActionModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        actionType={actionType ? actionType.replace('re_', '') : ''}
        task={selectedTask}
        onSubmit={handleActionSubmit}
        loading={submittingAction}
      />
    </EmployeeLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  scrollContent: {
    paddingBottom: 140,
  },

  // ── Today's Progress Dark Hero Card ───────────────────────────────────────
  heroCard: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  progressCircleWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  progressCircleOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  progressLabel: {
    fontSize: 8.5,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: -2,
  },
  heroMiddleContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 10.5,
    color: "#E0F2FE",
    marginTop: 2,
  },
  heroProgressTrack: {
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 2.5,
    overflow: "hidden",
    marginTop: 8,
  },
  heroProgressBar: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2.5,
  },
  heroTargetWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  targetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  heroStatCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatTextGroup: {
    flexDirection: "column",
  },
  heroStatNum: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroStatName: {
    fontSize: 8.5,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: -1,
  },

  // ── Status Pill Tabs ──────────────────────────────────────────────────────
  statusTabsWrapper: {
    marginBottom: 8,
  },
  statusPillTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  statusPillTabActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
  },
  statusPillBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusPillBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  statusPillBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  statusPillBadgeTextActive: {
    color: "#FFFFFF",
  },

  // ── Date Range Tabs ───────────────────────────────────────────────────────
  dateTabsWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  dateTabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 16,
    flexDirection: "row",
  },
  dateTabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  dateTabItemActive: {
    borderBottomColor: "#F97316",
  },
  dateTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  dateTabTextActive: {
    color: "#F97316",
    fontWeight: "800",
  },

  // ── Search & Sort Control Bar ──────────────────────────────────────────────
  searchSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
  },
  sortPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sortPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  filterToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Section Header Row ────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionAccentLine: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#F97316",
    marginRight: 8,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  viewToggleRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  viewToggleBtnActive: {
    padding: 4,
    backgroundColor: "#FFF7ED",
    borderRadius: 6,
  },
  viewToggleBtn: {
    padding: 4,
  },

  // ── Task Card Custom Styles ───────────────────────────────────────────────
  taskIconBoxCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  taskIconBoxSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  filterPillActive: {
    backgroundColor: "#F97316",
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterPillTextActive: {
    color: "#ffffff",
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
    backgroundColor: "#0d9488",
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

  // ── Task Card ─────────────────────────────────────────────────────────────
  taskCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 10,
    marginHorizontal: 12,
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
  checkBoxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
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
  fab: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0d9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 'auto',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
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
