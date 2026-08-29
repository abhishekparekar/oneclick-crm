import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  StatusBar,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from 'expo-av';
import { uploadMediaFileApi, submitFollowUpApi, updateTaskChecklistApi } from "../../api/taskService";
import { useAuth } from "../../context/AuthContext";
import {
  getTaskByIdApi,
  updateTaskStatusApi,
  addCompanyTaskCommentApi,
  shiftTaskApi,
  toggleTaskTemplateApi
} from "../../api/companyService";
import { getEmployeesApi } from "../../api/employeeService";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";
import DatePickerModal from "../../components/DatePickerModal";
import TaskActionModal from "../../components/TaskActionModal";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import api from "../../api/api";

const STATUS_CONFIG = {
  pending:          { bg: "#FEF9C3", text: "#A16207", border: "#FDE047", darkBg: "#B45309", label: "Pending" },
  in_process:       { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", darkBg: "#1D4ED8", label: "In Process" },
  complete:         { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  completed:        { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  done:             { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  overdue:          { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5", darkBg: "#B91C1C", label: "Overdue" },
  late_complete:    { bg: "#FEF9C3", text: "#A16207", border: "#FDE047", darkBg: "#B45309", label: "Late Completed" },
  re_pending:       { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", darkBg: "#6D28D9", label: "Re-Pending" },
  re_in_process:    { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", darkBg: "#1D4ED8", label: "Re-In Process" },
  re_complete:      { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  re_completed:     { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  re_late_complete: { bg: "#FEF9C3", text: "#A16207", border: "#FDE047", darkBg: "#B45309", label: "Late Completed" },
  active:           { bg: "#ECFDF5", text: "#047857", border: "#6EE7B7", darkBg: "#047857", label: "Active" },
  inactive:         { bg: "#FFF5F5", text: "#DC2626", border: "#FECACA", darkBg: "#991B1B", label: "Inactive" },
  todo:             { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", darkBg: "#334155", label: "To Do" },
  "in-progress":    { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", darkBg: "#1D4ED8", label: "In Progress" },
  review:           { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", darkBg: "#B45309", label: "In Review" },
};

const CompanyTaskDetailsScreen = ({ route, navigation }) => {
  const { taskId, initialTask } = route.params || {};
  const { user, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
      return () => { showSub.remove(); hideSub.remove(); };
    }
  }, []);

  const [task, setTask] = useState(initialTask || null);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const recordingTimerRef = useRef(null);

  // Re-open Modal state
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const [reopenRemarks, setReopenRemarks] = useState("");
  const [reopenEndDate, setReopenEndDate] = useState("");
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Shift Modal state
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [employees, setEmployees] = useState([]);

  // Cancel Modal state
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState("");
  const [statusPickerModalVisible, setStatusPickerModalVisible] = useState(false);

  const openActionModal = (type) => {
    setActionType(type);
    setActionModalVisible(true);
  };

  const scrollViewRef = useRef(null);

  const handleToggleRecurring = async () => {
    try {
      setSubmitting(true);
      const res = await toggleTaskTemplateApi(taskId);
      if (res.success) {
        setTask(prev => ({ ...prev, isActive: res.isActive }));
        Alert.alert("Success", res.message);
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSubmit = async (data) => {
    try {
      setSubmitting(true);
      if (actionType === "follow_up") {
        await submitFollowUpApi(taskId, {
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
        await updateTaskStatusApi(taskId, actionType, payload);
      }
      setActionModalVisible(false);
      fetchTask(true);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
      fetchTask(true);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (shiftModalVisible && employees.length === 0) {
      getEmployeesApi().then(res => setEmployees(res.data?.employees || []));
    }
  }, [shiftModalVisible]);

  const formatDateToDDMMYYYY = (date) => {
    const dayStr = String(date.getDate()).padStart(2, "0");
    const monthStr = String(date.getMonth() + 1).padStart(2, "0");
    return `${dayStr}/${monthStr}/${date.getFullYear()}`;
  };

  useEffect(() => {
    if (reopenModalVisible) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReopenEndDate(formatDateToDDMMYYYY(tomorrow));
    }
  }, [reopenModalVisible]);

  const fetchTask = useCallback(
    async (silent = false) => {
      if (!taskId) return;
      try {
        if (!silent) setRefreshing(true);
        const res = await getTaskByIdApi(taskId);
        const taskData = res.data?.task || res.data?.data?.task || res.data?.data;
        if (taskData && taskData._id) {
          setTask(taskData);
        }
      } catch (err) {
        if (!task) {
          Alert.alert("Error", err?.response?.data?.message || err.message);
          navigation.goBack();
        }
      } finally {
        setRefreshing(false);
      }
    },
    [taskId, navigation, task]
  );

  useEffect(() => {
    fetchTask(!!initialTask);
  }, [taskId]);

  const handleCancelTask = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Error", "Please provide a reason for cancelling this task.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await updateTaskStatusApi(taskId, "cancel", cancelReason);
      if (res.data && res.data.success) {
        Alert.alert("Success", "Task cancelled successfully.");
        setCancelModalVisible(false);
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to cancel task");
    } finally {
      setSubmitting(false);
    }
  };

  const executeReopen = async () => {
    if (!reopenEndDate) {
      Alert.alert("Error", "Please specify a new deadline.");
      return;
    }
    if (!reopenRemarks.trim()) {
      Alert.alert("Error", "Please provide a reason for re-opening.");
      return;
    }
    try {
      setSubmitting(true);
      const parts = reopenEndDate.split("/");
      let isoDate;
      if (parts.length === 3) {
        const dateObj = new Date(
          parseInt(parts[2], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[0], 10),
          23, 59, 59
        );
        isoDate = dateObj.toISOString();
      } else {
        Alert.alert("Error", "Invalid Date format.");
        return;
      }
      
      const payload = {
        newEndDate: isoDate,
        remarks: reopenRemarks.trim()
      };
      
      const res = await api.patch(`/tasks/${taskId}/reopen`, payload);
      if (res.data?.success || res.status === 200) {
        Alert.alert("Success", "Task reopened successfully.");
        setReopenModalVisible(false);
        setReopenRemarks("");
        setReopenEndDate("");
        
        const updatedTask = res.data?.task || res.data?.data?.task || res.data?.data;
        if (updatedTask && updatedTask.status) {
          setTask(updatedTask);
        } else {
          fetchTask(true);
        }
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Reopen failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const executeShiftTask = async () => {
    if (!newAssigneeId) {
      Alert.alert("Error", "Please select a new team member to assign.");
      return;
    }
    if (!shiftReason.trim()) {
      Alert.alert("Error", "Please provide a reason for shifting this task.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await shiftTaskApi(taskId, {
        newAssigneeId,
        shiftReason: shiftReason.trim(),
      });
      if (res.data?.success || res.status === 200) {
        Alert.alert("Success", "Task shifted successfully.");
        setShiftModalVisible(false);
        setShiftReason("");
        setNewAssigneeId("");
        fetchTask(true);
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Shift Task failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectMedia = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream"
        });
      }
    } catch (error) {
      console.error("Select media error:", error);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else {
        Alert.alert("Permission Required", "Please grant microphone permissions to record audio.");
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setAttachedFile({
          uri: uri,
          name: `AudioRecord_${Date.now()}.m4a`,
          type: "audio/m4a"
        });
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const playAudioPreview = async () => {
    if (!attachedFile || !attachedFile.uri) return;
    try {
      if (sound) {
        if (isPlayingAudio) {
          await sound.pauseAsync();
          setIsPlayingAudio(false);
        } else {
          await sound.playAsync();
          setIsPlayingAudio(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: attachedFile.uri },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingAudio(false);
          }
        });
        setSound(newSound);
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error("Error playing audio", error);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlayingAudio(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && !attachedFile) return;
    try {
      setSubmitting(true);
      let attachmentsList = [];
      if (attachedFile) {
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append("file", {
          uri: attachedFile.uri,
          name: attachedFile.name,
          type: attachedFile.type
        });
        const uploadRes = await uploadMediaFileApi(formData);
        if (uploadRes.data?.success && uploadRes.data?.fileUrl) {
          attachmentsList.push({
            fileUrl: uploadRes.data.fileUrl,
            fileName: uploadRes.data.fileName || attachedFile.name,
            fileType: uploadRes.data.fileType || attachedFile.type
          });
        }
        setUploadingMedia(false);
      }

      await addCompanyTaskCommentApi(taskId, newComment.trim(), attachmentsList);
      setNewComment("");
      setAttachedFile(null);
      fetchTask(true);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
      setUploadingMedia(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleChecklist = async (checkItem, idx) => {
    if (!task) return;
    const newStatus = !checkItem.isCompleted;

    // Optimistic UI update
    setTask((prevTask) => {
      if (!prevTask) return prevTask;
      const updatedChecklist = (prevTask.checklist || []).map((item, i) =>
        (item._id && checkItem._id && item._id === checkItem._id) || i === idx
          ? { ...item, isCompleted: newStatus }
          : item
      );
      return { ...prevTask, checklist: updatedChecklist };
    });

    try {
      const payload = {
        subtaskId: checkItem._id,
        itemIndex: idx,
        isCompleted: newStatus,
        completed: newStatus,
      };
      await updateTaskChecklistApi(taskId || task._id, payload);
    } catch (err) {
      console.error("Failed to toggle checklist item", err);
      fetchTask(true);
      Alert.alert("Error", err.response?.data?.message || "Failed to update checklist item");
    }
  };

  if (!task) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, fontFamily: FONTS.bodyMedium, color: COLORS.text.muted }}>
          Loading task details...
        </Text>
      </View>
    );
  }

  const normalizeStatusValue = (val) => {
    if (!val) return "";
    let s = val.toLowerCase().replace(/-/g, "_");
    if (s === "todo" || s === "pending" || s === "re_pending") return "pending";
    if (s === "in_progress" || s === "in_process" || s === "re_in_process" || s === "in-progress") return "in_process";
    if (s === "completed" || s === "done" || s === "complete" || s === "re_complete") return "complete";
    if (s === "late_completed" || s === "late_complete" || s === "re_late_complete") return "late_complete";
    return s;
  };

  const st = (task.status || "pending").toLowerCase();
  const normalizedSt = normalizeStatusValue(st);

  const isCompleted = ["complete", "completed", "done", "late_complete", "re_complete", "re_completed", "re_late_complete"].includes(normalizedSt);
  const isCancelled = ["cancel", "cancelled", "canceled"].includes(normalizedSt);
  const isInProcess = ["in_process", "re_in_process", "in-progress"].includes(normalizedSt);
  const isPending = ["pending", "re_pending", "todo"].includes(normalizedSt) || (!isCompleted && !isCancelled && !isInProcess);

  const isOverdueTime = task.endDateTime && new Date(task.endDateTime) < new Date() && !isCompleted && !isCancelled;
  const isOverdueActive = task.status === "overdue" || task.status === "re_overdue";
  const isOverdue = isOverdueTime || isOverdueActive;

  const delayText = isOverdueTime
    ? (() => { const diff = Math.abs(new Date() - new Date(task.endDateTime)); const d = Math.floor(diff/(1000*60*60*24)); const h = Math.floor((diff/(1000*60*60))%24); const m = Math.floor((diff/1000/60)%60); return [d>0&&`${d}d`,h>0&&`${h}h`,(d===0&&h===0)||m>0?`${m}m`:null].filter(Boolean).join(' ') + ' overdue'; })()
    : (task.status === 'late_complete' && task.delayedDuration)
    ? `${task.delayedDuration.days||0}d ${task.delayedDuration.hours||0}h late`
    : '';

  const priorityConfig = (() => {
    const p = task.priority?.toLowerCase();
    if (p === 'high') return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', icon: 'flame-outline', label: 'High Priority' };
    if (p === 'medium') return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', icon: 'alert-circle-outline', label: 'Medium Priority' };
    return { bg: '#F0FDF4', text: '#047857', border: '#BBF7D0', icon: 'checkmark-circle-outline', label: 'Low Priority' };
  })();

  const currentStatus = isOverdueActive
    ? { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", darkBg: "#B91C1C", label: "Overdue" }
    : STATUS_CONFIG[(task.status || "pending").toLowerCase()] || STATUS_CONFIG.pending;

  const assignees = Array.isArray(task.assignees) && task.assignees.length > 0
    ? task.assignees
    : task.assignedTo
    ? (Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo])
    : [];

  let deptName = typeof task.departmentId === 'object' ? task.departmentId?.name : null;
  if (!deptName || deptName === "[object Object]") deptName = "Company Wide";

  return (
    <CompanyAdminLayout
      navigation={navigation}
      headerTitle={task?.taskId ? `${task.taskId} - Details` : "Task Details"}
      showSearch={false}
      activeTab="Tasks"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 85 }}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={20}
          extraHeight={20}
          keyboardShouldPersistTaps="handled"
        >
          {/* Overdue / Delay Alert Banner */}
          {delayText ? (
            <LinearGradient
              colors={isOverdueTime ? ["#EF4444", "#DC2626"] : ["#F59E0B", "#D97706"]}
              style={styles.overdueBanner}
            >
              <Ionicons name="warning-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.overdueText}>{delayText}</Text>
            </LinearGradient>
          ) : null}

          {/* ── Native Hero Summary Section ── */}
          <View style={styles.nativeHeroContainer}>
            {/* Top Pill Badges Row */}
            <View style={styles.topBadgesRow}>
              {task.taskId ? (
                <View style={styles.idChip}>
                  <Text style={styles.idChipText}>{task.taskId}</Text>
                </View>
              ) : null}

              <View style={[styles.priorityChip, { backgroundColor: priorityConfig.bg, borderColor: priorityConfig.border }]}>
                <Ionicons name={priorityConfig.icon} size={11} color={priorityConfig.text} style={{ marginRight: 3 }} />
                <Text style={[styles.priorityChipText, { color: priorityConfig.text }]}>{priorityConfig.label}</Text>
              </View>

              <View style={[styles.statusChip, { backgroundColor: currentStatus.bg, borderColor: currentStatus.border }]}>
                <View style={[styles.statusDot, { backgroundColor: currentStatus.text }]} />
                <Text style={[styles.statusChipText, { color: currentStatus.text }]}>
                  {isOverdueActive ? "Overdue" : currentStatus.label}
                </Text>
              </View>
            </View>

            {/* Task Title */}
            <Text style={styles.nativeTaskTitle}>{task.title}</Text>

            {/* Task Description */}
            {task.description ? (
              <View style={styles.nativeDescBox}>
                <Text style={styles.nativeDescText}>{task.description}</Text>
              </View>
            ) : null}

            {/* Recurring Toggle Button */}
            {task.isTemplate && (
              <TouchableOpacity
                style={[
                  styles.nativeToggleTemplateBtn,
                  { backgroundColor: task.isActive === false ? "#10B981" : "#EF4444" }
                ]}
                onPress={handleToggleRecurring}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name={task.isActive === false ? "play-circle" : "stop-circle"} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.nativeToggleTemplateBtnText}>
                      {task.isActive === false ? "Resume Recurring Task" : "Stop Recurring Task"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* ── Native 2-Column Info Grid ── */}
            <View style={styles.nativeInfoGrid}>
              <View style={styles.nativeGridCell}>
                <Ionicons name="business-outline" size={15} color="#6366F1" style={styles.gridCellIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nativeGridLabel}>Department</Text>
                  <Text style={styles.nativeGridVal} numberOfLines={1}>{deptName}</Text>
                </View>
              </View>

              <View style={styles.nativeGridCell}>
                <Ionicons name="person-outline" size={15} color="#EC4899" style={styles.gridCellIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nativeGridLabel}>Assigned By</Text>
                  <Text style={styles.nativeGridVal} numberOfLines={1}>{task.assignedBy?.name || "Admin"}</Text>
                </View>
              </View>

              <View style={styles.nativeGridCell}>
                <Ionicons name="calendar-outline" size={15} color="#10B981" style={styles.gridCellIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nativeGridLabel}>Start Date</Text>
                  <Text style={styles.nativeGridVal}>
                    {task.startDateTime ? new Date(task.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                  </Text>
                </View>
              </View>

              <View style={[styles.nativeGridCell, isOverdueTime && { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                <Ionicons name="alarm-outline" size={15} color={isOverdueTime ? "#EF4444" : "#F59E0B"} style={styles.gridCellIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nativeGridLabel, isOverdueTime && { color: "#EF4444" }]}>Due Deadline</Text>
                  <Text style={[styles.nativeGridVal, isOverdueTime && { color: "#DC2626", fontFamily: FONTS.bodyBold }]}>
                    {task.endDateTime ? new Date(task.endDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No deadline"}
                  </Text>
                </View>
              </View>

              {task.nextFollowUpDate ? (
                <View style={[styles.nativeGridCell, { width: "100%", backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <Ionicons name="notifications-outline" size={15} color="#2563EB" style={styles.gridCellIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nativeGridLabel, { color: "#2563EB" }]}>Next Scheduled Follow-Up</Text>
                    <Text style={[styles.nativeGridVal, { color: "#1E40AF", fontFamily: FONTS.bodyBold }]}>
                      {new Date(task.nextFollowUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Assigned Staff Row */}
            <View style={styles.nativeAssigneeSection}>
              <Text style={styles.nativeSectionLabel}>ASSIGNED STAFF ({assignees.length})</Text>
              {assignees.length > 0 ? (
                <View style={styles.nativeAssigneeRow}>
                  {assignees.map((a, idx) => {
                    const initials = ((a.firstName || "S")[0] + (a.lastName || "")[0]).toUpperCase();
                    return (
                      <View key={idx} style={styles.nativeAssigneeChip}>
                        <View style={styles.nativeAvatarBadge}>
                          <Text style={styles.nativeAvatarText}>{initials}</Text>
                        </View>
                        <Text style={styles.nativeAssigneeName} numberOfLines={1}>
                          {a.firstName} {a.lastName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.nativeEmptyText}>Unassigned / Company Wide</Text>
              )}
            </View>

            {/* Checklist Section (if checklist exists) */}
            {task?.checklist && task.checklist.length > 0 && (
              <View style={styles.nativeChecklistSection}>
                <View style={styles.nativeChecklistHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="checkbox-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.nativeSectionLabel}>TASK CHECKLIST</Text>
                  </View>
                  <Text style={styles.nativeProgressText}>
                    {task.checklist.filter(c => c.isCompleted).length}/{task.checklist.length} Done
                  </Text>
                </View>
                {task.checklist.map((item, idx) => (
                  <TouchableOpacity
                    key={item._id || idx}
                    style={styles.nativeChecklistItem}
                    onPress={() => handleToggleChecklist(item, idx)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.isCompleted ? "checkbox" : "square-outline"}
                      size={18}
                      color={item.isCompleted ? "#16A34A" : "#94A3B8"}
                    />
                    <Text style={[styles.nativeChecklistTitle, item.isCompleted && styles.nativeChecklistTitleDone]}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── Native Status & Action Bar ── */}
          <View style={styles.nativeActionBar}>
            <View style={styles.nativeActionBarHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="options-outline" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.nativeSectionLabel}>WORKFLOW ACTIONS</Text>
              </View>
              <View style={[styles.statusBadgeCapsule, { backgroundColor: currentStatus.bg, borderColor: currentStatus.border }]}>
                <View style={[styles.statusDot, { backgroundColor: currentStatus.darkBg || currentStatus.text }]} />
                <Text style={[styles.statusBadgeCapsuleText, { color: currentStatus.darkBg || currentStatus.text }]}>
                  {currentStatus.label.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Primary Change Status Button with Darker Prominent Color */}
            <TouchableOpacity
              style={[
                styles.nativeChangeStatusBtn,
                {
                  backgroundColor: currentStatus.darkBg || currentStatus.text || "#1E293B",
                  borderColor: currentStatus.darkBg || currentStatus.text || "#0F172A",
                }
              ]}
              onPress={() => setStatusPickerModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.nativeChangeStatusInner}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={styles.nativeActionIconCircle}>
                    <Ionicons
                      name={
                        isCompleted ? "checkmark-circle" :
                        isInProcess ? "play-circle" :
                        isOverdue ? "alert-circle" :
                        "time"
                      }
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.nativeActionBtnTitle}>
                      Change Task Status
                    </Text>
                    <Text style={styles.nativeActionBtnSub}>
                      Current: {currentStatus.label} • Tap to update status
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Native Attachments ── */}
          {task?.attachments && task.attachments.length > 0 && (
            <View style={styles.nativeSectionContainer}>
              <Text style={styles.nativeSectionLabel}>ATTACHED FILES ({task.attachments.length})</Text>
              <View style={styles.nativeAttGrid}>
                {task.attachments.map((att, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.nativeAttCard}
                    onPress={() => WebBrowser.openBrowserAsync(att.fileUrl).catch(err => console.error("URL Open Err", err))}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#2563EB" />
                    <Text style={styles.nativeAttName} numberOfLines={1}>
                      {decodeURIComponent(att.fileName || "Attachment")}
                    </Text>
                    <Ionicons name="arrow-down-circle-outline" size={16} color="#64748B" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Native Discussion Stream ── */}
          <View style={styles.nativeSectionContainer}>
            <Text style={styles.nativeSectionLabel}>COMMENTS & ACTIVITY ({task.comments?.length || 0})</Text>
            {(!task.comments || task.comments.length === 0) ? (
              <Text style={styles.nativeEmptyText}>No discussion yet. Leave a note below!</Text>
            ) : (
              task.comments.map((c, i) => {
                const isCurrentUser = c.addedBy === user?._id || c.senderName?.includes(user?.name?.split(" ")[0]) || c.senderName === user?.name;
                return (
                  <View 
                    key={i} 
                    style={[
                      styles.nativeCommentBubble,
                      isCurrentUser ? styles.nativeCommentBubbleUser : styles.nativeCommentBubbleOther
                    ]}
                  >
                    <Text style={[styles.nativeCommentAuthor, { color: isCurrentUser ? "#93C5FD" : "#64748B" }]}>
                      {isCurrentUser ? "You" : c.senderName || "User"} • {c.senderRole || "Member"}
                    </Text>

                    {c.comment ? (
                      <Text style={[styles.nativeCommentBody, { color: isCurrentUser ? "#FFFFFF" : "#0F172A" }]}>
                        {c.comment}
                      </Text>
                    ) : null}

                    {c.attachments && c.attachments.map((att, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={[
                          styles.nativeCommentAtt,
                          { backgroundColor: isCurrentUser ? "rgba(255, 255, 255, 0.18)" : "#E2E8F0" }
                        ]}
                        onPress={() => WebBrowser.openBrowserAsync(att.fileUrl).catch(err => console.error("URL Open Err", err))}
                      >
                        {att.fileType?.startsWith('image') ? (
                          <Image source={{ uri: att.fileUrl }} style={styles.nativeCommentImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name="document-outline" size={14} color={isCurrentUser ? "#FFFFFF" : "#475569"} />
                        )}
                        <Text style={[styles.nativeCommentAttText, { color: isCurrentUser ? "#FFFFFF" : "#475569" }]} numberOfLines={1}>
                          {decodeURIComponent(att.fileName || "Attachment")}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <Text style={[styles.nativeCommentTime, { color: isCurrentUser ? "#93C5FD" : "#94A3B8" }]}>
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: 10 }} />
        </KeyboardAwareScrollView>

        {/* ── Sticky Comment Input Bar ── */}
        <View style={[styles.stickyCommentBar, { paddingBottom: Math.max(insets.bottom, 12) + (Platform.OS === 'android' ? keyboardHeight : 0) }]}>
          {attachedFile && (
            <View style={styles.attachedPreviewRow}>
              {attachedFile.type?.startsWith('audio') ? (
                <TouchableOpacity onPress={playAudioPreview} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons name={isPlayingAudio ? "pause-circle" : "play-circle"} size={26} color={COLORS.primary} />
                  <Text style={styles.attachedPreviewText} numberOfLines={1}>
                    Audio Note Attached (Tap to preview)
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.attachedPreviewIcon}>
                    <Ionicons name="document-text" size={16} color="#475569" />
                  </View>
                  <Text style={styles.attachedPreviewText} numberOfLines={1}>
                    {attachedFile.name}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={removeAttachedFile} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {isRecording && (
            <View style={styles.recordingBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="mic" size={20} color="#EF4444" />
                <Text style={styles.recordingText}>
                  Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </Text>
              </View>
              <TouchableOpacity onPress={stopRecording} style={styles.recordingStopBtn}>
                <Text style={styles.recordingStopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.commentInputRow}>
            <TouchableOpacity style={styles.mediaActionBtn} onPress={handleSelectMedia} disabled={isRecording}>
              <Ionicons name="attach" size={22} color={COLORS.slateMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaActionBtn} onPress={startRecording} disabled={isRecording || !!attachedFile}>
              <Ionicons name="mic" size={22} color={isRecording ? "#EF4444" : COLORS.slateMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.commentInput}
              placeholder="Type a comment or update..."
              placeholderTextColor="#64748B"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              blurOnSubmit={false}
            />

            <TouchableOpacity 
              style={[
                styles.commentSendBtn,
                (!newComment.trim() && !attachedFile) && { backgroundColor: '#E2E8F0' }
              ]} 
              onPress={handleAddComment} 
              disabled={submitting || uploadingMedia || (!newComment.trim() && !attachedFile) || isRecording}
              activeOpacity={0.85}
            >
              {submitting || uploadingMedia ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={(!newComment.trim() && !attachedFile) ? "#94A3B8" : "#FFFFFF"}
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>

      {/* ── Reopen Task Modal ── */}
      <Modal visible={reopenModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Re-Open Task</Text>
              <TouchableOpacity onPress={() => setReopenModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>New Deadline (DD/MM/YYYY) *</Text>
            <TouchableOpacity onPress={() => setShowCalendarModal(true)} style={styles.modalDateBox}>
              <Text style={styles.modalDateBoxText}>{reopenEndDate || "Select Date"}</Text>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={styles.modalLabel}>Reason for Re-Opening *</Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Explain why this task is being reopened..."
              placeholderTextColor="#94A3B8"
              value={reopenRemarks}
              onChangeText={setReopenRemarks}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={executeReopen} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Confirm Re-Open</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Shift Task Modal ── */}
      <Modal visible={shiftModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Shift Task Assignment</Text>
              <TouchableOpacity onPress={() => setShiftModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Select New Assignee *</Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {employees.map(emp => {
                const isSelected = newAssigneeId === emp._id;
                return (
                  <TouchableOpacity
                    key={emp._id}
                    style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                    onPress={() => setNewAssigneeId(emp._id)}
                  >
                    <Text style={styles.modalItemTitle}>{emp.firstName} {emp.lastName}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>Reason for Shifting *</Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Reason for reassignment..."
              placeholderTextColor="#94A3B8"
              value={shiftReason}
              onChangeText={setShiftReason}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={executeShiftTask} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Confirm Shift</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cancel Task Modal ── */}
      <Modal visible={cancelModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Cancel Task</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Cancellation Reason *</Text>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Provide details on why this task is cancelled..."
              placeholderTextColor="#94A3B8"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: "#EF4444" }]} onPress={handleCancelTask} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSubmitBtnText}>Confirm Cancel Task</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Status Picker Bottom Sheet Modal ── */}
      <Modal
        visible={statusPickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusPickerModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setStatusPickerModalVisible(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Change Task Status</Text>
                <Text style={styles.modalSubTitle}>Select a new status to update this task</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusPickerModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Option: In Process (Show if task is Pending or Overdue and not completed/cancelled) */}
              {(isPending || isOverdue) && !isCompleted && !isCancelled && (
                <TouchableOpacity
                  style={[styles.statusOptionRow, { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" }]}
                  onPress={() => {
                    setStatusPickerModalVisible(false);
                    openActionModal("in_process");
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusOptionIconWrap, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="play-circle" size={22} color="#1D4ED8" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.statusOptionTitle, { color: "#1E40AF" }]}>In Process / Start Work</Text>
                    <Text style={styles.statusOptionDesc}>Start working or mark task as in progress</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#1D4ED8" />
                </TouchableOpacity>
              )}

              {/* Option: Completed (Show if not already completed/cancelled) */}
              {!isCompleted && !isCancelled && (
                <TouchableOpacity
                  style={[styles.statusOptionRow, { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" }]}
                  onPress={() => {
                    setStatusPickerModalVisible(false);
                    openActionModal("complete");
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusOptionIconWrap, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="checkmark-done-circle" size={22} color="#15803D" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.statusOptionTitle, { color: "#15803D" }]}>Mark Complete</Text>
                    <Text style={styles.statusOptionDesc}>Mark task as fully resolved and finished</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#15803D" />
                </TouchableOpacity>
              )}

              {/* Option: Move back to Pending (Show if task is currently In Process) */}
              {isInProcess && (
                <TouchableOpacity
                  style={[styles.statusOptionRow, { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" }]}
                  onPress={() => {
                    setStatusPickerModalVisible(false);
                    openActionModal("pending");
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusOptionIconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="pause-circle" size={22} color="#B45309" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.statusOptionTitle, { color: "#B45309" }]}>Hold / Pending</Text>
                    <Text style={styles.statusOptionDesc}>Pause work & move task back to waiting queue</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#B45309" />
                </TouchableOpacity>
              )}

              {/* Option: Cancel Task (Show if not already completed/cancelled) */}
              {!isCompleted && !isCancelled && (
                <TouchableOpacity
                  style={[styles.statusOptionRow, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}
                  onPress={() => {
                    setStatusPickerModalVisible(false);
                    setCancelModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusOptionIconWrap, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="close-circle" size={20} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.statusOptionTitle, { color: "#B91C1C" }]}>Cancel Task</Text>
                    <Text style={styles.statusOptionDesc}>Terminate this task with reason</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}

              {/* Option: Re-Open Task (ONLY SHOW WHEN TASK IS COMPLETED OR CANCELLED) */}
              {(isCompleted || isCancelled) && (
                <TouchableOpacity
                  style={[styles.statusOptionRow, { borderColor: "#E9D5FF", backgroundColor: "#FAF5FF" }]}
                  onPress={() => {
                    setStatusPickerModalVisible(false);
                    setReopenModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusOptionIconWrap, { backgroundColor: "#F3E8FF" }]}>
                    <Ionicons name="refresh-circle" size={22} color="#6D28D9" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.statusOptionTitle, { color: "#6B21A8" }]}>Re-Open Task</Text>
                    <Text style={styles.statusOptionDesc}>Set a new deadline & resume workflow</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6D28D9" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <DatePickerModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onSelectDate={(formattedDate) => {
          setReopenEndDate(formattedDate);
          setShowCalendarModal(false);
        }}
      />

      <TaskActionModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        actionType={actionType}
        task={task}
        onSubmit={handleActionSubmit}
        loading={submitting}
      />
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitleText: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerIdBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.4)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 3,
  },
  headerIdBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  deleteTaskBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  overdueText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  nativeHeroContainer: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  topBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 6,
  },
  idChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  idChipText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#1D4ED8",
  },
  priorityChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusChipText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  nativeTaskTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    lineHeight: 23,
    marginBottom: 6,
  },
  nativeDescBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  nativeDescText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: "#0F172A",
    lineHeight: 19,
  },
  nativeToggleTemplateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    marginBottom: 8,
  },
  nativeToggleTemplateBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
  },
  nativeInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  nativeGridCell: {
    width: "49%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  gridCellIcon: {
    marginRight: 6,
  },
  nativeGridLabel: {
    fontSize: 9.5,
    color: "#475569",
    fontFamily: FONTS.bodyBold,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  nativeGridVal: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  nativeAssigneeSection: {
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingTop: 8,
    marginTop: 4,
  },
  nativeSectionLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  nativeAssigneeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  nativeAssigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 5,
  },
  nativeAvatarBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
  },
  nativeAvatarText: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  nativeAssigneeName: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  nativeEmptyText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#64748B",
    fontStyle: "italic",
  },
  nativeChecklistSection: {
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingTop: 8,
    marginTop: 8,
  },
  nativeChecklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  nativeProgressText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: "#15803D",
  },
  nativeChecklistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 5,
    gap: 6,
  },
  nativeChecklistTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    flex: 1,
  },
  nativeChecklistTitleDone: {
    textDecorationLine: "line-through",
    color: "#64748B",
  },
  nativeActionBar: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  nativeActionBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusBadgeCapsule: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeCapsuleText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  nativeChangeStatusBtn: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 0,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  nativeChangeStatusInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nativeActionIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  nativeActionBtnTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontFamily: FONTS.displayBold,
  },
  nativeActionBtnSub: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 10.5,
    fontFamily: FONTS.body,
  },
  nativeQuickRow: {
    flexDirection: "row",
    gap: 6,
  },
  nativeQuickPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    gap: 4,
  },
  nativeQuickPillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  nativeSectionContainer: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  nativeAttGrid: {
    gap: 5,
  },
  nativeAttCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  nativeAttName: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  nativeCommentBubble: {
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
    maxWidth: "92%",
  },
  nativeCommentBubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#1E40AF",
    borderBottomRightRadius: 2,
  },
  nativeCommentBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 2,
  },
  nativeCommentAuthor: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    marginBottom: 2,
  },
  nativeCommentBody: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    lineHeight: 17,
  },
  nativeCommentAtt: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    gap: 6,
  },
  nativeCommentImg: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  nativeCommentAttText: {
    fontSize: 11,
    fontFamily: FONTS.body,
    flex: 1,
  },
  nativeCommentTime: {
    fontSize: 9.5,
    fontFamily: FONTS.body,
    marginTop: 4,
    textAlign: "right",
  },
  stickyCommentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 8,
    paddingHorizontal: 12,
    ...SHADOWS.md,
  },
  attachedPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
  },
  attachedPreviewIcon: {
    marginRight: 6,
  },
  attachedPreviewText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: "#1E40AF",
    flex: 1,
  },
  recordingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  recordingText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#EF4444",
    marginLeft: 6,
  },
  recordingStopBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recordingStopBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mediaActionBtn: {
    padding: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    fontFamily: FONTS.body,
    fontSize: 13,
    maxHeight: 80,
    color: "#0F172A",
  },
  commentSendBtn: {
    backgroundColor: "#1D4ED8",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.darkNavy,
  },
  modalSubTitle: {
    fontFamily: FONTS.body,
    fontSize: 11.5,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  modalCloseIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.darkNavy,
    marginTop: 8,
    marginBottom: 5,
  },
  modalDateBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
  },
  modalDateBoxText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
  },
  modalTextarea: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.darkNavy,
    minHeight: 65,
    textAlignVertical: "top",
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  modalSubmitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
  modalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemRowSelected: {
    backgroundColor: COLORS.primaryGhost,
  },
  modalItemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
  },
  statusOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusOptionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statusOptionTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
  },
  statusOptionDesc: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  modalSectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  modalSectionLabelText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#047857",
    fontWeight: "900",
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  rollbackWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  rollbackWarningText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#B45309",
    fontWeight: "800",
  },
});

export default CompanyTaskDetailsScreen;
