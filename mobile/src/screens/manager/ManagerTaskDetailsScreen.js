import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  StatusBar,
  Modal,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import useManagerController from "../../controllers/managerController";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../../context/AuthContext";
import { Audio } from 'expo-av';
import TaskActionModal from "../../components/TaskActionModal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { submitFollowUpApi, updateTaskChecklistApi } from "../../api/taskService";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toggleTaskTemplateApi } from "../../api/managerApi";
import * as WebBrowser from 'expo-web-browser';
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";

const STATUS_COLORS = {
  pending:          { bg: "#FEF9C3", text: "#A16207", border: "#FDE047", darkBg: "#B45309", label: "Pending" },
  re_pending:       { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", darkBg: "#6D28D9", label: "Re-Pending" },
  in_process:       { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", darkBg: "#1D4ED8", label: "In Process" },
  re_in_process:    { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", darkBg: "#1D4ED8", label: "Re-In Process" },
  complete:         { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  completed:        { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  done:             { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  late_complete:    { bg: "#FEF9C3", text: "#A16207", border: "#FDE047", darkBg: "#B45309", label: "Late Completed" },
  re_late_complete: { bg: "#FEF9C3", text: "#A16207", border: "#FDE047", darkBg: "#B45309", label: "Late Completed" },
  re_complete:      { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  re_completed:     { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", darkBg: "#15803D", label: "Completed" },
  overdue:          { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5", darkBg: "#B91C1C", label: "Overdue" },
  todo:             { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", darkBg: "#334155", label: "To Do" },
  "in-progress":    { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", darkBg: "#1D4ED8", label: "In Progress" },
  review:           { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", darkBg: "#B45309", label: "In Review" },
};

const ManagerTaskDetailsScreen = ({ route, navigation }) => {
  const { taskId } = route.params || {};
  const { user, hasPermission } = useAuth();
  const {
    getTaskDetailsData,
    updateTaskStatusData,
    addComment,
    uploadMedia,
    removeTask,
  } = useManagerController();

  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
      return () => { showSub.remove(); hideSub.remove(); };
    }
  }, []);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const scrollViewRef = useRef(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const recordingTimerRef = useRef(null);

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState("");
  const [statusPickerModalVisible, setStatusPickerModalVisible] = useState(false);

  const openActionModal = (type) => {
    setActionType(type);
    setActionModalVisible(true);
  };

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
        await updateTaskStatusData(taskId, actionType, payload);
      }
      setActionModalVisible(false);
      await fetchTask();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTask = () => {
    Alert.alert(
      "Cancel Task",
      "Are you sure you want to cancel/delete this task?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              await removeTask(taskId);
              Alert.alert("Success", "Task cancelled successfully.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err?.response?.data?.message || err.message);
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTaskDetailsData(taskId);
      if (data && data.task) {
        setTask(data.task);
      } else {
        setTask(data);
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [taskId, getTaskDetailsData, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchTask();
    }, [fetchTask])
  );

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
        
        const uploadRes = await uploadMedia(formData);
        if (uploadRes && uploadRes.success) {
          attachmentsList.push({
            fileUrl: uploadRes.fileUrl,
            fileName: uploadRes.fileName,
            fileType: uploadRes.fileType
          });
        }
        setUploadingMedia(false);
      }

      await addComment(taskId, newComment, attachmentsList);
      setNewComment("");
      setAttachedFile(null);
      await fetchTask();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
      setUploadingMedia(false);
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
      fetchTask();
      Alert.alert("Error", err.response?.data?.message || "Failed to update checklist item");
    }
  };

  if (loading || !task) {
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
    : STATUS_COLORS[(task.status || "pending").toLowerCase()] || STATUS_COLORS.pending;

  const statusBannerGradient = (() => {
    if (isCompleted) return ["#059669", "#10B981"];
    if (isCancelled) return ["#475569", "#334155"];
    if (isOverdueActive || isOverdueTime) return ["#DC2626", "#EF4444"];
    if (isInProcess) return ["#1D4ED8", "#2563EB"];
    return ["#D97706", "#F59E0B"]; // Pending / default
  })();

  const statusBannerIconColor = (() => {
    if (isCompleted) return "#059669";
    if (isCancelled) return "#475569";
    if (isOverdueActive || isOverdueTime) return "#DC2626";
    if (isInProcess) return "#1D4ED8";
    return "#B45309";
  })();

  const assignees = Array.isArray(task.assignees) && task.assignees.length > 0
    ? task.assignees
    : task.assignedTo
    ? (Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo])
    : [];

  let deptName = typeof task.departmentId === 'object' ? task.departmentId?.name : null;
  if (!deptName && task.assignees && task.assignees.length > 0) {
    const assignee = task.assignees[0];
    if (assignee.departmentName) {
      deptName = assignee.departmentName;
    } else if (assignee.departmentId?.name) {
      deptName = assignee.departmentId.name;
    } else if (assignee.departmentIds && assignee.departmentIds.length > 0) {
      deptName = assignee.departmentIds.map(d => d.name || "Dept").join(", ");
    }
  } else if (!deptName && task.assignedTo) {
    const arr = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    if (arr.length > 0) {
      const assignee = arr[0];
      if (assignee.departmentName) {
        deptName = assignee.departmentName;
      } else if (assignee.departmentId?.name) {
        deptName = assignee.departmentId.name;
      } else if (assignee.departmentIds && assignee.departmentIds.length > 0) {
        deptName = assignee.departmentIds.map(d => d.name || "Dept").join(", ");
      }
    }
  }
  if (!deptName || deptName === "[object Object]") deptName = "No Department";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Premium Dark Hero Header ── */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitleText}>Task Details</Text>
          {task.taskId && (
            <View style={styles.headerIdBadge}>
              <Text style={styles.headerIdBadgeText}>{task.taskId}</Text>
            </View>
          )}
        </View>

        {hasPermission("tasks", "cancel") ? (
          <TouchableOpacity onPress={handleCancelTask} style={styles.deleteTaskBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#FCA5A5" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </LinearGradient>

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
            {task.isTemplate && hasPermission("tasks", "update") && (
              <View style={{ marginBottom: 10 }}>
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
              </View>
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
                  <Text style={styles.nativeGridVal} numberOfLines={1}>{task.assignedBy?.name || "Company Admin"}</Text>
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

              {task.projectId?.name ? (
                <View style={[styles.nativeGridCell, { width: "100%", backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <Ionicons name="folder-open-outline" size={15} color="#2563EB" style={styles.gridCellIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nativeGridLabel, { color: "#2563EB" }]}>Project</Text>
                    <Text style={[styles.nativeGridVal, { color: "#1E40AF", fontFamily: FONTS.bodyBold }]}>{task.projectId.name}</Text>
                  </View>
                </View>
              ) : null}

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
                <Text style={styles.nativeEmptyText}>Unassigned</Text>
              )}
            </View>

            {/* Checklist Section */}
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

      {/* ── Status Selection Action Sheet Modal ── */}
      <Modal
        visible={statusPickerModalVisible}
        transparent={true}
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
                    openActionModal("in-process");
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
                    openActionModal(isOverdue ? "late-complete" : "complete");
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

              {/* Option: Submit Follow-Up (Always available for active task) */}
              {!isCompleted && !isCancelled && (
                <TouchableOpacity
                  style={[styles.statusOptionRow, { borderColor: "#99F6E4", backgroundColor: "#F0FDFA" }]}
                  onPress={() => {
                    setStatusPickerModalVisible(false);
                    openActionModal("follow_up");
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusOptionIconWrap, { backgroundColor: "#CCFBF1" }]}>
                    <Ionicons name="calendar" size={20} color="#0F766E" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.statusOptionTitle, { color: "#0F766E" }]}>Next Follow-Up</Text>
                    <Text style={styles.statusOptionDesc}>Add progress remark & set next follow-up date</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#0F766E" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TaskActionModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        actionType={actionType}
        task={task}
        onSubmit={handleActionSubmit}
        loading={submitting}
      />
    </View>
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
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  // ── Seamless Native Hero Section (No Cards) ──
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
  // ── Flat 2-Column Info Grid (No Box Borders) ──
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
  // ── Seamless Assignee Section ──
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
  // ── Seamless Checklist Section ──
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
    gap: 5,
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
  // ── Seamless Section Container (Files & Activity) ──
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
  // ── Native Comments Stream ──
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
  // ── Sticky Comment Bar ──
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
  // ── Modals ──
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

export default ManagerTaskDetailsScreen;
