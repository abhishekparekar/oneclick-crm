import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import api, { getApiBaseUrl } from "../api/api";
import { formatDateToDDMMYYYY } from "../utils/dateFormatter";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const parseDDMMYYYYToDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof dateStr === "string") {
    const trimmed = dateStr.trim();
    if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day, 0, 0, 0);
        }
      }
    }
    if (trimmed.includes("-")) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
  }
  return null;
};

export const combineDateAndTimeToISO = (dateStr, timeStr) => {
  if (!dateStr) return null;
  let year, month, day;

  if (typeof dateStr === "string" && dateStr.includes("/")) {
    const parts = dateStr.split("/");
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  } else {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    day = parsed.getDate();
    month = parsed.getMonth();
    year = parsed.getFullYear();
  }

  let hour = 10;
  let minute = 0;

  if (timeStr && typeof timeStr === "string") {
    const isPM = /pm/i.test(timeStr);
    const isAM = /am/i.test(timeStr);
    const cleanTime = timeStr.replace(/am|pm/gi, "").trim();
    if (cleanTime.includes(":")) {
      const [hPart, mPart] = cleanTime.split(":");
      let rawH = parseInt(hPart, 10) || 0;
      minute = parseInt(mPart, 10) || 0;

      if (isPM) {
        hour = rawH === 12 ? 12 : rawH + 12;
      } else if (isAM) {
        hour = rawH === 12 ? 0 : rawH;
      } else {
        hour = rawH;
      }
    }
  }

  const d = new Date(year, month, day, hour, minute, 0);
  return d.toISOString();
};

const TaskActionModal = ({
  visible,
  onClose,
  actionType,
  task,
  onSubmit,
  loading,
}) => {
  const insets = useSafeAreaInsets();
  const [remarks, setRemarks] = useState("");
  const [followUpDate, setFollowUpDate] = useState(null); // DD/MM/YYYY
  const [followUpTime, setFollowUpTime] = useState("10:00 AM"); // 12h format
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Integrated Picker Panels (No nested Modals)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Calendar State
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Time Picker State
  const [timeHour, setTimeHour] = useState("10");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timePeriod, setTimePeriod] = useState("AM"); // 'AM' | 'PM'

  const normalizedActionType = (actionType || "").toLowerCase().replace(/-/g, "_");
  const wasVisibleRef = useRef(false);

  // Initialize & reset state when modal opens
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      setRemarks("");
      setAttachments([]);
      setShowDatePicker(false);
      setShowTimePicker(false);

      const now = new Date();
      setCalYear(now.getFullYear());
      setCalMonth(now.getMonth());

      if (task?.nextFollowUpDate) {
        const d = new Date(task.nextFollowUpDate);
        if (!isNaN(d.getTime())) {
          setFollowUpDate(formatDateToDDMMYYYY(d));
          setCalYear(d.getFullYear());
          setCalMonth(d.getMonth());

          let h = d.getHours();
          const m = String(d.getMinutes()).padStart(2, "0");
          const period = h >= 12 ? "PM" : "AM";
          h = h % 12 || 12;
          const hStr = String(h).padStart(2, "0");
          setFollowUpTime(`${hStr}:${m} ${period}`);
          setTimeHour(hStr);
          setTimeMinute(m);
          setTimePeriod(period);
        } else {
          setFollowUpDate(null);
          setFollowUpTime("10:00 AM");
          setTimeHour("10");
          setTimeMinute("00");
          setTimePeriod("AM");
        }
      } else {
        // Default follow-up date to today for in_process
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        setFollowUpDate(`${dd}/${mm}/${yyyy}`);
        setFollowUpTime("10:00 AM");
        setTimeHour("10");
        setTimeMinute("00");
        setTimePeriod("AM");
      }
    } else if (!visible) {
      wasVisibleRef.current = false;
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible, normalizedActionType, task]);

  // Audio Recording State
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);
  const [sound, setSound] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);

  // Clean up sound on unmount/close
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [sound]);

  // Date helper functions
  const setQuickDate = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const dd = String(target.getDate()).padStart(2, "0");
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const yyyy = target.getFullYear();
    setFollowUpDate(`${dd}/${mm}/${yyyy}`);
    setCalYear(target.getFullYear());
    setCalMonth(target.getMonth());
    setShowDatePicker(false);
  };

  const setQuickTime = (timeString) => {
    setFollowUpTime(timeString);
    const isPM = /pm/i.test(timeString);
    const clean = timeString.replace(/am|pm/gi, "").trim();
    if (clean.includes(":")) {
      const [h, m] = clean.split(":");
      setTimeHour(h.padStart(2, "0"));
      setTimeMinute(m.padStart(2, "0"));
      setTimePeriod(isPM ? "PM" : "AM");
    }
    setShowTimePicker(false);
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ key: `empty-${i}`, isEmpty: true });
    }

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(calYear, calMonth, d, 0, 0, 0);
      const isPast = cellDate.getTime() < todayMidnight.getTime();
      const dd = String(d).padStart(2, "0");
      const mm = String(calMonth + 1).padStart(2, "0");
      const dateStr = `${dd}/${mm}/${calYear}`;
      const isSelected = followUpDate === dateStr;
      const isToday = cellDate.getTime() === todayMidnight.getTime();

      days.push({
        key: `day-${d}`,
        dayNumber: d,
        dateStr,
        isPast,
        isSelected,
        isToday,
      });
    }

    return days;
  }, [calYear, calMonth, followUpDate]);

  const handleSelectCalendarDay = (dayObj) => {
    if (dayObj.isPast) {
      Alert.alert("Invalid Date", "Please select today or a future date for follow-up.");
      return;
    }
    setFollowUpDate(dayObj.dateStr);
    setShowDatePicker(false);
  };

  const applyCustomTime = (h, m, p) => {
    const finalH = h || timeHour;
    const finalM = m || timeMinute;
    const finalP = p || timePeriod;
    setFollowUpTime(`${finalH}:${finalM} ${finalP}`);
  };

  // Attachment Handling
  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: ["*/*"],
      });
      if (result.canceled) return;

      const localFiles = (result.assets || []).map((asset) => ({
        uri: asset.uri,
        fileName: asset.name || "attachment",
        fileType: asset.mimeType || "application/octet-stream",
        isLocal: true,
      }));

      setAttachments((prev) => [...prev, ...localFiles]);
    } catch (err) {
      console.warn("Attachment pick error:", err);
      Alert.alert("Error", "Could not select file.");
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } else {
        Alert.alert("Permission Required", "Microphone access is required to record audio.");
      }
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start audio recording.");
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (uri) {
          setAttachments((prev) => [
            ...prev,
            {
              uri,
              fileName: `VoiceNote_${Date.now()}.m4a`,
              fileType: "audio/m4a",
              isLocal: true,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to stop recording", error);
    }
  };

  const playAudioPreview = async (uri, index) => {
    if (!uri) return;
    try {
      if (sound && playingIndex === index) {
        if (isPlayingAudio) {
          await sound.pauseAsync();
          setIsPlayingAudio(false);
        } else {
          await sound.playAsync();
          setIsPlayingAudio(true);
        }
      } else {
        if (sound) {
          await sound.stopAsync().catch(() => {});
          await sound.unloadAsync().catch(() => {});
        }
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingAudio(false);
            setPlayingIndex(null);
          }
        });
        setSound(newSound);
        setIsPlayingAudio(true);
        setPlayingIndex(index);
      }
    } catch (error) {
      console.error("Failed to play audio", error);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    if (playingIndex === index) {
      if (sound) sound.unloadAsync().catch(() => {});
      setPlayingIndex(null);
      setIsPlayingAudio(false);
    }
  };

  // Upload helper with token resolution
  const uploadSingleFile = async (att) => {
    const baseUrl = getApiBaseUrl();
    let token = api.defaults.headers.common?.Authorization || api.defaults.headers.common?.authorization;
    if (!token) {
      try {
        const stored = await AsyncStorage.getItem("hrms_token");
        if (stored) token = `Bearer ${stored}`;
      } catch (_) {}
    }

    if (
      FileSystem?.uploadAsync &&
      att.uri &&
      (att.uri.startsWith("file://") || att.uri.startsWith("content://"))
    ) {
      try {
        const uploadType =
          FileSystem.FileSystemUploadType?.MULTIPART ??
          FileSystem.UploadType?.MULTIPART ??
          1;

        const res = await FileSystem.uploadAsync(
          `${baseUrl}/tasks/upload-media`,
          att.uri,
          {
            fieldName: "file",
            httpMethod: "POST",
            uploadType,
            headers: token ? { Authorization: token } : {},
          }
        );

        const data = JSON.parse(res.body);
        if (res.status >= 200 && res.status < 300 && (data.fileUrl || data.url)) {
          return {
            fileName: data.fileName || data.filename || att.fileName || "attachment",
            fileUrl: data.fileUrl || data.url,
            fileType: data.fileType || att.fileType || "application/octet-stream",
          };
        }
      } catch (fsErr) {
        console.warn("FileSystem upload error, falling back to FormData:", fsErr);
      }
    }

    // Fallback: Axios FormData
    const formData = new FormData();
    formData.append("file", {
      uri: att.uri,
      name: att.fileName || "attachment",
      type: att.fileType || "application/octet-stream",
    });

    const res = await api.post("/tasks/upload-media", formData);
    const data = res?.data || res;
    if (data && (data.fileUrl || data.url)) {
      return {
        fileName: data.fileName || data.filename || att.fileName || "attachment",
        fileUrl: data.fileUrl || data.url,
        fileType: data.fileType || att.fileType || "application/octet-stream",
      };
    }
    throw new Error("Could not process attachment upload");
  };

  const handleSubmit = async () => {
    if (!remarks.trim() && attachments.length === 0) {
      return Alert.alert(
        "Required Field",
        "Please provide Remarks / Progress notes OR upload an Attachment before proceeding."
      );
    }

    if (normalizedActionType === "in_process" || normalizedActionType === "follow_up") {
      if (!followUpDate) {
        return Alert.alert("Required Date", "Please select a Next Follow-up Date.");
      }

      const selectedDate = parseDDMMYYYYToDate(followUpDate);
      if (selectedDate && task?.startDateTime) {
        const startDate = new Date(task.startDateTime);
        startDate.setHours(0, 0, 0, 0);
        if (selectedDate < startDate) {
          const startStr = formatDateToDDMMYYYY(startDate);
          return Alert.alert(
            "Invalid Date",
            `Follow-up date cannot be earlier than task start date (${startStr}).`
          );
        }
      }
    }

    setUploading(true);
    setUploadStatusText("Processing...");

    try {
      const finalAttachments = [];
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.isLocal) {
          setUploadStatusText(`Uploading file ${i + 1} of ${attachments.length}...`);
          const uploaded = await uploadSingleFile(att);
          finalAttachments.push(uploaded);
        } else {
          finalAttachments.push(att);
        }
      }

      setUploadStatusText("Updating task status...");
      const payloadFollowUp = followUpDate
        ? combineDateAndTimeToISO(followUpDate, followUpTime)
        : null;

      onSubmit({
        remarks: remarks.trim(),
        finalRemarks: remarks.trim(),
        nextFollowUpDate: payloadFollowUp,
        attachments: finalAttachments,
      });
    } catch (err) {
      console.error("Task action submit error:", err);
      Alert.alert(
        "Action Failed",
        err?.response?.data?.message ||
          err?.message ||
          "Failed to complete task action. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadStatusText("");
    }
  };

  const getTitle = () => {
    if (normalizedActionType === "in_process") return "Mark In-Process";
    if (normalizedActionType === "late_complete") return "Mark Late Complete";
    if (normalizedActionType === "follow_up") return "Add Follow-up";
    return "Mark Complete";
  };

  const getButtonText = () => {
    if (normalizedActionType === "in_process") return "Start Task (In-Process)";
    if (normalizedActionType === "late_complete") return "Submit Late Complete";
    if (normalizedActionType === "follow_up") return "Save Follow-up";
    return "Complete Task";
  };

  const getButtonColor = () => {
    if (normalizedActionType === "in_process") return "#1D4ED8";
    if (normalizedActionType === "late_complete") return "#EA580C";
    if (normalizedActionType === "follow_up") return "#0D9488";
    return "#16A34A";
  };

  const quickRemarks = [
    "🚀 Work Started",
    "📞 Client Contacted",
    "⚙️ In Progress",
    "📝 Initial Review",
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <View style={[styles.statusIconWrap, { backgroundColor: normalizedActionType === "in_process" ? "#DBEAFE" : "#DCFCE7" }]}>
                  <Ionicons
                    name={normalizedActionType === "in_process" ? "play" : "checkmark-done"}
                    size={16}
                    color={normalizedActionType === "in_process" ? "#1D4ED8" : "#15803D"}
                  />
                </View>
                <Text style={styles.title}>{getTitle()}</Text>
              </View>
              <Text style={styles.subTitle}>
                {normalizedActionType === "in_process"
                  ? "Set follow-up date, time & initial progress message"
                  : "Submit completion details and closing remarks"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {normalizedActionType === "late_complete" && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.warningText}>
                  This task is overdue. Marking it complete now will record the delay in history.
                </Text>
              </View>
            )}

            {/* ── Section: Follow-up Date & Time ── */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Next Follow-up Date &amp; Time{" "}
                  {normalizedActionType === "in_process" || normalizedActionType === "follow_up" ? (
                    <Text style={{ color: "#DC2626" }}>*</Text>
                  ) : (
                    <Text style={{ color: "#94A3B8", fontWeight: "normal" }}>(Optional)</Text>
                  )}
                </Text>
              </View>

              {/* Date & Time Trigger Buttons */}
              <View style={styles.dateTimeTriggerRow}>
                <TouchableOpacity
                  style={[styles.pickerTriggerCard, showDatePicker && styles.pickerTriggerCardActive]}
                  onPress={() => {
                    setShowDatePicker(!showDatePicker);
                    setShowTimePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={18} color="#1D4ED8" />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.pickerTriggerLabel}>DATE</Text>
                    <Text style={styles.pickerTriggerValue}>
                      {followUpDate || "Select Date"}
                    </Text>
                  </View>
                  <Ionicons
                    name={showDatePicker ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#64748B"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerTriggerCard, showTimePicker && styles.pickerTriggerCardActive]}
                  onPress={() => {
                    setShowTimePicker(!showTimePicker);
                    setShowDatePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time" size={18} color="#0D9488" />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.pickerTriggerLabel}>TIME</Text>
                    <Text style={styles.pickerTriggerValue}>
                      {followUpTime || "10:00 AM"}
                    </Text>
                  </View>
                  <Ionicons
                    name={showTimePicker ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Quick Date Presets */}
              <View style={styles.quickChipsRow}>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(0)}>
                  <Text style={styles.quickChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(1)}>
                  <Text style={styles.quickChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(2)}>
                  <Text style={styles.quickChipText}>+2 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(7)}>
                  <Text style={styles.quickChipText}>+1 Week</Text>
                </TouchableOpacity>
              </View>

              {/* ── Integrated Calendar View (No nested Modal) ── */}
              {showDatePicker && (
                <View style={styles.calendarContainer}>
                  {/* Month Navigation */}
                  <View style={styles.calHeader}>
                    <TouchableOpacity
                      onPress={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      style={styles.calNavBtn}
                    >
                      <Ionicons name="chevron-back" size={18} color="#1E293B" />
                    </TouchableOpacity>

                    <Text style={styles.calMonthTitle}>
                      {MONTH_NAMES[calMonth]} {calYear}
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear((y) => y + 1);
                        } else {
                          setCalMonth((m) => m + 1);
                        }
                      }}
                      style={styles.calNavBtn}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#1E293B" />
                    </TouchableOpacity>
                  </View>

                  {/* Weekday Row */}
                  <View style={styles.calWeekdaysRow}>
                    {WEEKDAY_NAMES.map((w, idx) => (
                      <Text key={idx} style={styles.calWeekdayText}>
                        {w}
                      </Text>
                    ))}
                  </View>

                  {/* Day Cells Grid */}
                  <View style={styles.calDaysGrid}>
                    {calendarDays.map((item) => {
                      if (item.isEmpty) {
                        return <View key={item.key} style={styles.calEmptyCell} />;
                      }
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.calDayCell,
                            item.isSelected && styles.calDayCellSelected,
                            item.isToday && !item.isSelected && styles.calDayCellToday,
                          ]}
                          onPress={() => handleSelectCalendarDay(item)}
                          disabled={item.isPast}
                        >
                          <Text
                            style={[
                              styles.calDayText,
                              item.isSelected && styles.calDayTextSelected,
                              item.isToday && !item.isSelected && styles.calDayTextToday,
                              item.isPast && styles.calDayTextPast,
                            ]}
                          >
                            {item.dayNumber}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.calFooterRow}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.calDoneBtn}
                    >
                      <Text style={styles.calDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ── Integrated Time Picker View (No nested Modal) ── */}
              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerTitle}>SELECT TIME</Text>

                  {/* Quick Time Presets */}
                  <View style={styles.quickChipsRow}>
                    {["10:00 AM", "12:00 PM", "02:30 PM", "05:00 PM", "07:00 PM"].map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.quickTimeChip,
                          followUpTime === t && styles.quickTimeChipSelected,
                        ]}
                        onPress={() => setQuickTime(t)}
                      >
                        <Text
                          style={[
                            styles.quickTimeChipText,
                            followUpTime === t && styles.quickTimeChipTextSelected,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Custom Hours & Minutes Selector */}
                  <View style={styles.timeControlsRow}>
                    {/* Hour Column */}
                    <View style={styles.timeCol}>
                      <Text style={styles.timeColLabel}>HOUR</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                        {["09", "10", "11", "12", "01", "02", "03", "04", "05", "06", "07", "08"].map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[
                              styles.timePill,
                              timeHour === h && styles.timePillSelected,
                            ]}
                            onPress={() => {
                              setTimeHour(h);
                              applyCustomTime(h, timeMinute, timePeriod);
                            }}
                          >
                            <Text
                              style={[
                                styles.timePillText,
                                timeHour === h && styles.timePillTextSelected,
                              ]}
                            >
                              {h}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Minute Column */}
                    <View style={[styles.timeCol, { marginLeft: 12 }]}>
                      <Text style={styles.timeColLabel}>MIN</Text>
                      <View style={{ flexDirection: "row" }}>
                        {["00", "15", "30", "45"].map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[
                              styles.timePill,
                              timeMinute === m && styles.timePillSelected,
                            ]}
                            onPress={() => {
                              setTimeMinute(m);
                              applyCustomTime(timeHour, m, timePeriod);
                            }}
                          >
                            <Text
                              style={[
                                styles.timePillText,
                                timeMinute === m && styles.timePillTextSelected,
                              ]}
                            >
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* AM / PM Toggle */}
                    <View style={[styles.timeCol, { marginLeft: 12 }]}>
                      <Text style={styles.timeColLabel}>AM/PM</Text>
                      <View style={{ flexDirection: "row" }}>
                        {["AM", "PM"].map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.timePill,
                              timePeriod === p && styles.timePillSelected,
                            ]}
                            onPress={() => {
                              setTimePeriod(p);
                              applyCustomTime(timeHour, timeMinute, p);
                            }}
                          >
                            <Text
                              style={[
                                styles.timePillText,
                                timePeriod === p && styles.timePillTextSelected,
                              ]}
                            >
                              {p}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.calFooterRow}>
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(false)}
                      style={styles.calDoneBtn}
                    >
                      <Text style={styles.calDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* ── Section: Remarks / Progress Notes ── */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  {normalizedActionType === "in_process"
                    ? "Remarks / Progress Update"
                    : "Final Remarks"}{" "}
                  <Text style={{ color: "#DC2626" }}>*</Text>
                </Text>
                <Text style={styles.charCountText}>{remarks.length}/500</Text>
              </View>

              {normalizedActionType === "in_process" && (
                <View style={[styles.quickChipsRow, { marginBottom: 8 }]}>
                  {quickRemarks.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickChip}
                      onPress={() => {
                        const cleanQ = q.replace(/^[^\w\s]+\s*/, "");
                        setRemarks((prev) => (prev ? `${prev} - ${cleanQ}` : cleanQ));
                      }}
                    >
                      <Text style={styles.quickChipText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                maxLength={500}
                placeholder={
                  normalizedActionType === "in_process"
                    ? "Describe what work has started or current progress..."
                    : "Enter concluding remarks..."
                }
                placeholderTextColor="#94A3B8"
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>

            {/* ── Section: Attachments & Voice Recording ── */}
            <View style={styles.field}>
              <Text style={styles.label}>Attachments &amp; Voice Notes</Text>

              <View style={styles.attachBtnGroup}>
                <TouchableOpacity
                  style={[styles.attachBtn, { flex: 1, marginRight: 8 }]}
                  onPress={handlePickAttachment}
                  disabled={uploading || loading || isRecording}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-attach-outline" size={18} color="#0284C7" />
                  <Text style={styles.attachBtnText}>Add Document / File</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attachBtn,
                    isRecording && { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={uploading || loading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isRecording ? "stop-circle" : "mic"}
                    size={18}
                    color={isRecording ? "#EF4444" : "#EA580C"}
                  />
                  <Text
                    style={[
                      styles.attachBtnText,
                      { color: isRecording ? "#EF4444" : "#EA580C", marginLeft: 6 },
                    ]}
                  >
                    {isRecording
                      ? `${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "Voice Note"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Attachments List */}
              {attachments.map((file, index) => (
                <View key={index} style={styles.attachRow}>
                  {file.fileType?.startsWith("image") ? (
                    <Image
                      source={{ uri: file.uri || file.fileUrl }}
                      style={styles.attachThumb}
                    />
                  ) : file.fileType?.startsWith("audio") ? (
                    <TouchableOpacity
                      onPress={() => playAudioPreview(file.uri || file.fileUrl, index)}
                      style={{ marginRight: 8 }}
                    >
                      <Ionicons
                        name={
                          isPlayingAudio && playingIndex === index
                            ? "pause-circle"
                            : "play-circle"
                        }
                        size={28}
                        color="#EA580C"
                      />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons
                      name="document-text"
                      size={24}
                      color="#64748B"
                      style={{ marginRight: 8 }}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachName} numberOfLines={1}>
                      {decodeURIComponent(file.fileName || "Attachment")}
                    </Text>
                    {file.isLocal && <Text style={styles.attachSub}>Pending upload</Text>}
                  </View>

                  <TouchableOpacity
                    onPress={() => removeAttachment(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading || uploading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: getButtonColor() },
                (loading || uploading) && styles.disabledBtn,
              ]}
              onPress={handleSubmit}
              disabled={loading || uploading}
              activeOpacity={0.8}
            >
              {loading || uploading ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>
                    {uploadStatusText || "Updating..."}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name={normalizedActionType === "in_process" ? "play-circle" : "checkmark-circle"}
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.submitBtnText}>{getButtonText()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  subTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  warningText: {
    marginLeft: 8,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  field: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  charCountText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  dateTimeTriggerRow: {
    flexDirection: "row",
    gap: 8,
  },
  pickerTriggerCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerTriggerCardActive: {
    borderColor: "#1D4ED8",
    backgroundColor: "#EFF6FF",
  },
  pickerTriggerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  pickerTriggerValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  calendarContainer: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    padding: 14,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  calWeekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 4,
  },
  calWeekdayText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    width: 34,
    textAlign: "center",
  },
  calDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  calEmptyCell: {
    width: 34,
    height: 34,
    marginVertical: 2,
  },
  calDayCell: {
    width: 34,
    height: 34,
    marginVertical: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  calDayCellSelected: {
    backgroundColor: "#1D4ED8",
  },
  calDayCellToday: {
    borderWidth: 1.5,
    borderColor: "#1D4ED8",
  },
  calDayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  calDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  calDayTextToday: {
    color: "#1D4ED8",
    fontWeight: "800",
  },
  calDayTextPast: {
    color: "#CBD5E1",
  },
  calFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  calDoneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
  },
  calDoneBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  timePickerContainer: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#99F6E4",
    padding: 14,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  timePickerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D9488",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  quickTimeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  quickTimeChipSelected: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  quickTimeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D9488",
  },
  quickTimeChipTextSelected: {
    color: "#FFFFFF",
  },
  timeControlsRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  timeCol: {
    flex: 1,
  },
  timeColLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 4,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  timePillSelected: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  timePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  timePillTextSelected: {
    color: "#FFFFFF",
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    minHeight: 100,
    lineHeight: 20,
  },
  attachBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
  },
  attachBtnText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  attachThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 10,
  },
  attachName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  attachSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    marginRight: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.65,
  },
});

export default TaskActionModal;
