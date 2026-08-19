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
import { uploadMediaFileApi, submitFollowUpApi } from "../../api/taskService";
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
  pending:       { bg: "#FEF9C3", text: "#CA8A04", border: "#FEF08A", label: "Pending" },
  in_process:    { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "In Process" },
  complete:      { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0", label: "Completed" },
  completed:     { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0", label: "Completed" },
  done:          { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0", label: "Completed" },
  overdue:       { bg: "#FEE2E2", text: "#EF4444", border: "#FCA5A5", label: "Overdue" },
  late_complete: { bg: "#FEF9C3", text: "#CA8A04", border: "#FEF08A", label: "Late Completed" },
  re_pending:    { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", label: "Re-Pending" },
  re_in_process: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Re-In Process" },
  re_complete:   { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0", label: "Completed" },
  re_completed:  { bg: "#DCFCE7", text: "#16A34A", border: "#BBF7D0", label: "Completed" },
  re_late_complete: { bg: "#FEF9C3", text: "#CA8A04", border: "#FEF08A", label: "Late Completed" },
  active:        { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0", label: "Active" },
  inactive:      { bg: "#FFF5F5", text: "#E53E3E", border: "#FED7D7", label: "Inactive" },
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

  const isOverdueTime = task.endDateTime && new Date(task.endDateTime) < new Date() && !["completed", "complete", "done", "late_complete", "re_late_complete", "re_complete", "re_completed"].includes((task.status || "").toLowerCase());
  const isOverdueActive = task.status === "overdue" || task.status === "re_overdue";
  const isOverdue = isOverdueTime || isOverdueActive;

  const delayText = isOverdueTime
    ? (() => { const diff = Math.abs(new Date() - new Date(task.endDateTime)); const d = Math.floor(diff/(1000*60*60*24)); const h = Math.floor((diff/(1000*60*60))%24); const m = Math.floor((diff/1000/60)%60); return [d>0&&`${d}d`,h>0&&`${h}h`,(d===0&&h===0)||m>0?`${m}m`:null].filter(Boolean).join(' ') + ' overdue'; })()
    : (task.status === 'late_complete' && task.delayedDuration)
    ? `${task.delayedDuration.days||0}d ${task.delayedDuration.hours||0}h late`
    : '';

  const priorityConfig = (() => {
    const p = task.priority?.toLowerCase();
    if (p === 'high') return { bg: '#FEE2E2', text: '#EF4444', border: '#FCA5A5', icon: 'flame-outline', label: 'High Priority' };
    if (p === 'medium') return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: 'alert-circle-outline', label: 'Medium Priority' };
    return { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0', icon: 'checkmark-circle-outline', label: 'Low Priority' };
  })();

  const currentStatus = isOverdueActive
    ? { bg: "#FEE2E2", text: "#EF4444", border: "#FCA5A5", label: "Overdue" }
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
          contentContainerStyle={{ paddingBottom: 160 }}
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
              <Ionicons name="warning-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.overdueText}>{delayText}</Text>
            </LinearGradient>
          ) : null}

          {/* ── Hero Task Header Card ── */}
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              {/* Priority Badge */}
              <View style={[styles.badge, { backgroundColor: priorityConfig.bg, borderColor: priorityConfig.border }]}>
                <Ionicons name={priorityConfig.icon} size={12} color={priorityConfig.text} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: priorityConfig.text }]}>
                  {priorityConfig.label}
                </Text>
              </View>

              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: currentStatus.bg, borderColor: currentStatus.border }]}>
                <View style={[styles.statusDot, { backgroundColor: currentStatus.text }]} />
                <Text style={[styles.statusText, { color: currentStatus.text }]}>
                  {isOverdueActive ? "Overdue" : currentStatus.label}
                </Text>
              </View>
            </View>

            <Text style={styles.taskTitle}>
              {task.taskId ? `${task.taskId} - ${task.title}` : task.title}
            </Text>

            {task.description ? (
              <View style={styles.descBox}>
                <Text style={styles.taskDesc}>{task.description}</Text>
              </View>
            ) : (
              <Text style={styles.noDesc}>No detailed description provided.</Text>
            )}

            {/* Stop/Resume Recurring Task Toggle */}
            {task.isTemplate && (
              <View style={{ marginTop: 14 }}>
                <TouchableOpacity
                  style={[
                    styles.toggleTemplateBtn,
                    { backgroundColor: task.isActive === false ? "#10B981" : "#EF4444" }
                  ]}
                  onPress={handleToggleRecurring}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name={task.isActive === false ? "play-circle" : "stop-circle"} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.toggleTemplateBtnText}>
                        {task.isActive === false ? "Resume Recurring Task" : "Stop Recurring Task"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Metadata Compact Grid ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="info" size={15} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Task Information</Text>
            </View>

            <View style={styles.grid}>
              {/* Task ID */}
              {task.taskId && (
                <View style={styles.gridItem}>
                  <View style={styles.gridIconWrap}>
                    <Ionicons name="key-outline" size={15} color="#6366F1" />
                  </View>
                  <View style={styles.gridContent}>
                    <Text style={styles.gridLabel}>Task ID</Text>
                    <Text style={styles.gridValue} numberOfLines={1}>{task.taskId}</Text>
                  </View>
                </View>
              )}

              {/* Assigned By */}
              <View style={styles.gridItem}>
                <View style={styles.gridIconWrap}>
                  <Ionicons name="person-circle-outline" size={15} color="#EC4899" />
                </View>
                <View style={styles.gridContent}>
                  <Text style={styles.gridLabel}>Assigned By</Text>
                  <Text style={styles.gridValue} numberOfLines={1}>{task.assignedBy?.name || "Company Admin"}</Text>
                </View>
              </View>

              {/* Department */}
              <View style={styles.gridItem}>
                <View style={styles.gridIconWrap}>
                  <Feather name="layers" size={14} color="#0D9488" />
                </View>
                <View style={styles.gridContent}>
                  <Text style={styles.gridLabel}>Department</Text>
                  <Text style={styles.gridValue} numberOfLines={1}>{deptName}</Text>
                </View>
              </View>

              {/* Start Date */}
              {task.startDateTime && (
                <View style={styles.gridItem}>
                  <View style={styles.gridIconWrap}>
                    <Ionicons name="calendar-outline" size={15} color="#10B981" />
                  </View>
                  <View style={styles.gridContent}>
                    <Text style={styles.gridLabel}>Start Date</Text>
                    <Text style={styles.gridValue}>
                      {new Date(task.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Due Date */}
              {task.endDateTime && !task.isTemplate && (
                <View style={styles.gridItem}>
                  <View style={[styles.gridIconWrap, isOverdueTime && { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="time-outline" size={15} color={isOverdueTime ? "#EF4444" : "#F59E0B"} />
                  </View>
                  <View style={styles.gridContent}>
                    <Text style={styles.gridLabel}>Due Date</Text>
                    <Text style={[styles.gridValue, isOverdueTime && { color: "#EF4444", fontWeight: "700" }]}>
                      {new Date(task.endDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Next Follow-up Date */}
              {task.nextFollowUpDate && (
                <View style={styles.gridItem}>
                  <View style={styles.gridIconWrap}>
                    <Ionicons name="notifications-outline" size={15} color="#2563EB" />
                  </View>
                  <View style={styles.gridContent}>
                    <Text style={styles.gridLabel}>Next Follow-up</Text>
                    <Text style={[styles.gridValue, { color: "#2563EB", fontWeight: "700" }]}>
                      {new Date(task.nextFollowUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Assigned Staff Area */}
            <View style={styles.assigneesBox}>
              <Text style={styles.gridLabel}>Assigned Staff</Text>
              {assignees.length > 0 ? (
                <View style={styles.assigneesList}>
                  {assignees.map((a, idx) => {
                    const initials = ((a.firstName || "S")[0] + (a.lastName || "")[0]).toUpperCase();
                    return (
                      <View key={idx} style={styles.assigneeChip}>
                        <View style={styles.assigneeAvatar}>
                          <Text style={styles.assigneeAvatarText}>{initials}</Text>
                        </View>
                        <Text style={styles.assigneeName} numberOfLines={1}>
                          {a.firstName} {a.lastName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.unassignedText}>Unassigned / All Staff</Text>
              )}
            </View>
          </View>

          {/* ── Workflow Progress Stepper ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="git-commit-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Task Workflow Progress</Text>
            </View>

            <View style={styles.stepperContainer}>
              {/* Step 1: Pending */}
              <View style={styles.stepNodeWrap}>
                <View style={[
                  styles.stepNodeCircle,
                  (normalizedSt === "in_process" || normalizedSt === "complete" || normalizedSt === "late_complete")
                    ? styles.stepNodeSuccess
                    : (normalizedSt === "pending" ? styles.stepNodeActive : styles.stepNodeInactive)
                ]}>
                  {(normalizedSt === "in_process" || normalizedSt === "complete" || normalizedSt === "late_complete") ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.stepInnerDot} />
                  )}
                </View>
                <Text style={styles.stepLabel}>Pending</Text>
              </View>

              {/* Connecting Line 1 */}
              <View style={[
                styles.stepLine,
                (normalizedSt === "in_process" || normalizedSt === "complete" || normalizedSt === "late_complete") && styles.stepLineActive
              ]} />

              {/* Step 2: In Process */}
              <View style={styles.stepNodeWrap}>
                <View style={[
                  styles.stepNodeCircle,
                  (normalizedSt === "complete" || normalizedSt === "late_complete")
                    ? styles.stepNodeSuccess
                    : (normalizedSt === "in_process" ? styles.stepNodeActive : styles.stepNodeInactive)
                ]}>
                  {(normalizedSt === "complete" || normalizedSt === "late_complete") ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.stepInnerDot} />
                  )}
                </View>
                <Text style={styles.stepLabel}>In Process</Text>
              </View>

              {/* Connecting Line 2 */}
              <View style={[
                styles.stepLine,
                (normalizedSt === "complete" || normalizedSt === "late_complete") && styles.stepLineActive
              ]} />

              {/* Step 3: Completed */}
              <View style={styles.stepNodeWrap}>
                <View style={[
                  styles.stepNodeCircle,
                  (normalizedSt === "complete" || normalizedSt === "late_complete") ? styles.stepNodeSuccess : styles.stepNodeInactive
                ]}>
                  {(normalizedSt === "complete" || normalizedSt === "late_complete") ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.stepInnerDot} />
                  )}
                </View>
                <Text style={styles.stepLabel}>
                  {normalizedSt === "late_complete" ? "Late Done" : "Completed"}
                </Text>
              </View>
            </View>

            {/* Contextual Action Buttons for Admin */}
            <View style={{ marginTop: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[styles.workflowActionBtn, { flex: 1, backgroundColor: "#4F46E5" }]}
                  onPress={() => setShiftModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.workflowActionBtnText}>Shift Task</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.workflowActionBtn, { flex: 1, backgroundColor: "#7C3AED" }]}
                  onPress={() => setReopenModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.workflowActionBtnText}>Re-Open Task</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.workflowActionBtn, { backgroundColor: "#0D9488" }]}
                onPress={() => openActionModal("follow_up")}
                activeOpacity={0.85}
              >
                <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.workflowActionBtnText}>Submit Follow-Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Task Attachments Section ── */}
          {task?.attachments && task.attachments.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-attach-outline" size={16} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Task Attachments ({task.attachments.length})</Text>
              </View>

              {task.attachments.map((att, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.attachmentCard}
                  onPress={() => WebBrowser.openBrowserAsync(att.fileUrl).catch(err => console.error("URL Open Err", err))}
                  activeOpacity={0.8}
                >
                  <View style={styles.attachmentIconBox}>
                    <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.attachmentFileName} numberOfLines={1}>
                    {decodeURIComponent(att.fileName || "Attachment")}
                  </Text>
                  <Ionicons name="open-outline" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Comments & Discussion Timeline ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="chatbubbles-outline" size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Comments & Discussion</Text>
            </View>

            {(!task.comments || task.comments.length === 0) ? (
              <Text style={styles.noCommentsText}>No discussion comments yet. Be the first to comment below!</Text>
            ) : (
              task.comments.map((c, i) => {
                const isCurrentUser = c.addedBy === user?._id || c.senderName?.includes(user?.name?.split(" ")[0]) || c.senderName === user?.name;
                return (
                  <View 
                    key={i} 
                    style={[
                      styles.commentBubble,
                      isCurrentUser ? styles.commentBubbleUser : styles.commentBubbleOther
                    ]}
                  >
                    <Text style={[styles.commentAuthor, { color: isCurrentUser ? COLORS.primaryPale : COLORS.slateMuted }]}>
                      {isCurrentUser ? "You" : c.senderName || "User"} ({c.senderRole || "Member"})
                    </Text>

                    {c.comment ? (
                      <Text style={[styles.commentBody, { color: isCurrentUser ? "#FFFFFF" : COLORS.darkNavy }]}>
                        {c.comment}
                      </Text>
                    ) : null}

                    {c.attachments && c.attachments.map((att, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={[
                          styles.commentAttChip,
                          { backgroundColor: isCurrentUser ? "rgba(255, 255, 255, 0.2)" : "#E2E8F0" }
                        ]}
                        onPress={() => WebBrowser.openBrowserAsync(att.fileUrl).catch(err => console.error("URL Open Err", err))}
                      >
                        {att.fileType?.startsWith('image') ? (
                          <Image source={{ uri: att.fileUrl }} style={styles.commentAttImage} resizeMode="cover" />
                        ) : (
                          <Ionicons name="document-outline" size={14} color={isCurrentUser ? "#FFFFFF" : "#475569"} />
                        )}
                        <Text style={[styles.commentAttText, { color: isCurrentUser ? "#FFFFFF" : "#475569" }]} numberOfLines={1}>
                          {decodeURIComponent(att.fileName || "Attachment")}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <Text style={[styles.commentTime, { color: isCurrentUser ? COLORS.primaryPale : COLORS.text.muted }]}>
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
              placeholderTextColor="#94A3B8"
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
    padding: 14,
  },
  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  overdueText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  taskTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.darkNavy,
    lineHeight: 24,
    marginBottom: 10,
  },
  descBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  taskDesc: {
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  noDesc: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    fontStyle: "italic",
  },
  toggleTemplateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    ...SHADOWS.sm,
  },
  toggleTemplateBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.darkNavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  gridItem: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 9,
    gap: 8,
  },
  gridIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  gridContent: {
    flex: 1,
    minWidth: 0,
  },
  gridLabel: {
    fontSize: 9.5,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyBold,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.darkNavy,
  },
  assigneesBox: {
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingTop: 10,
  },
  assigneesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  assigneeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    paddingRight: 10,
    paddingLeft: 3,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeAvatarText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  assigneeName: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.darkNavy,
  },
  unassignedText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    fontStyle: "italic",
    marginTop: 4,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  stepNodeWrap: {
    alignItems: "center",
    flex: 1,
  },
  stepNodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNodeSuccess: {
    backgroundColor: "#10B981",
  },
  stepNodeActive: {
    backgroundColor: "#F59E0B",
  },
  stepNodeInactive: {
    backgroundColor: "#CBD5E1",
  },
  stepInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 10.5,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyBold,
    marginTop: 5,
  },
  stepLine: {
    height: 3,
    flex: 1,
    backgroundColor: "#CBD5E1",
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: "#10B981",
  },
  workflowActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    ...SHADOWS.sm,
  },
  workflowActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachmentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryPale,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  attachmentFileName: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.darkNavy,
    flex: 1,
  },
  noCommentsText: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 12,
  },
  commentBubble: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    maxWidth: "85%",
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  commentBubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2,
  },
  commentBubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 2,
  },
  commentAuthor: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  commentBody: {
    fontSize: 13.5,
    fontFamily: FONTS.body,
    marginTop: 3,
    lineHeight: 18,
  },
  commentAttChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  commentAttImage: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginRight: 6,
  },
  commentAttText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
    flex: 1,
  },
  commentTime: {
    fontSize: 9,
    fontFamily: FONTS.body,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  stickyCommentBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    ...SHADOWS.md,
  },
  attachedPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachedPreviewIcon: {
    backgroundColor: "#E2E8F0",
    padding: 6,
    borderRadius: 6,
  },
  attachedPreviewText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.darkNavy,
    marginLeft: 8,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  recordingText: {
    marginLeft: 8,
    color: '#EF4444',
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
  },
  recordingStopBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  recordingStopBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  mediaActionBtn: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#F8FAFC",
    fontFamily: FONTS.body,
    fontSize: 13.5,
    maxHeight: 90,
    color: COLORS.darkNavy,
  },
  commentSendBtn: {
    backgroundColor: COLORS.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: COLORS.darkNavy,
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.darkNavy,
    marginTop: 10,
    marginBottom: 6,
  },
  modalDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  modalDateBoxText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  modalTextarea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemRowSelected: {
    backgroundColor: COLORS.primaryGhost,
  },
  modalItemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
});

export default CompanyTaskDetailsScreen;
