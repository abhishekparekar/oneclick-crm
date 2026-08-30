import React, { useState } from "react";
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
import { Audio } from "expo-av";
import AppDatePicker from "./AppDatePicker";
import AppTimePicker from "./AppTimePicker";
import { uploadMediaFileApi } from "../api/taskService";
import { parseDDMMYYYYToISO } from "../utils/dateFormatter";

const parseDDMMYYYY = (dateStr) => {
  if (!dateStr || !dateStr.includes("/")) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day, 0, 0, 0);
    }
  }
  return null;
};

const combineDateAndTimeToISO = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    let hour = 10;
    let minute = 0;
    if (timeStr && timeStr.includes(":")) {
      const [h, m] = timeStr.split(":");
      hour = parseInt(h, 10) || 10;
      minute = parseInt(m, 10) || 0;
    }
    const d = new Date(year, month, day, hour, minute, 0);
    return d.toISOString();
  }
  return null;
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
  const [followUpDate, setFollowUpDate] = useState(null);
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const normalizedActionType = (actionType || "").toLowerCase().replace(/-/g, "_");

  // Auto-set follow-up date for daily recurring tasks when starting
  React.useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setRemarks("");
      setAttachments([]);
      setFollowUpDate(null);

      // For daily recurring templates → auto-fill today's date as follow-up
      if (
        normalizedActionType === "in_process" &&
        task?.isTemplate &&
        task?.repeatType?.toLowerCase() === "daily"
      ) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        setFollowUpDate(`${dd}/${mm}/${yyyy}`);
      }
    }
  }, [visible, normalizedActionType, task]);

  // Audio Recording State
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = React.useRef(null);
  const [sound, setSound] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);

  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: ["image/*", "application/pdf", "audio/*", "video/*"],
      });
      if (result.canceled) return;

      const localFiles = [];
      for (const asset of result.assets || []) {
        localFiles.push({
          uri: asset.uri,
          fileName: asset.name || "attachment",
          fileType: asset.mimeType || "application/octet-stream",
          isLocal: true,
        });
      }
      setAttachments((prev) => [...prev, ...localFiles]);
    } catch (err) {
      Alert.alert("Error", "Could not select attachment.");
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
        setAttachments(prev => [...prev, {
          uri: uri,
          fileName: `AudioRecord_${Date.now()}.m4a`,
          fileType: "audio/m4a",
          isLocal: true
        }]);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
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
          await sound.stopAsync();
          await sound.unloadAsync();
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
      if (sound) sound.unloadAsync();
      setPlayingIndex(null);
      setIsPlayingAudio(false);
    }
  };

  const handleSubmit = async () => {
    if (!remarks.trim() && attachments.length === 0) {
      return Alert.alert("Required", "Please provide Notes (Remarks) OR upload an Attachment before continuing.");
    }

    if (normalizedActionType === "in_process" || normalizedActionType === "follow_up") {
      if (!followUpDate) {
        return Alert.alert("Required", "Please select a Next Follow-up Date.");
      }
      
      const selectedDate = parseDDMMYYYY(followUpDate);
      if (selectedDate && task) {
        if (task.startDateTime) {
          const startDate = new Date(task.startDateTime);
          startDate.setHours(0, 0, 0, 0);
          if (selectedDate < startDate) {
            const startStr = startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
            return Alert.alert(
              "Invalid Date",
              `Follow-up date cannot be before the task's start date (${startStr}).`
            );
          }
        }
      }
    }
    
    setUploading(true);
    try {
      const finalAttachments = [];
      for (const att of attachments) {
        if (att.isLocal) {
          const formData = new FormData();
          formData.append("file", {
            uri: att.uri,
            name: att.fileName || "attachment",
            type: att.fileType || "application/octet-stream",
          });
          const res = await uploadMediaFileApi(formData);
          const data = res?.data || res;
          if (data && (data.fileUrl || data.url || data.success)) {
            finalAttachments.push({
              fileName: data.fileName || data.filename || att.fileName || "attachment",
              fileUrl: data.fileUrl || data.url,
              fileType: data.fileType || att.fileType || "application/octet-stream",
            });
          }
        } else {
          finalAttachments.push(att);
        }
      }
      
      onSubmit({
        remarks,
        nextFollowUpDate: (normalizedActionType === "in_process" || normalizedActionType === "follow_up") ? (followUpDate ? combineDateAndTimeToISO(followUpDate, followUpTime) : null) : null,
        attachments: finalAttachments,
      });
    } catch (err) {
      console.error("Attachment upload error:", err);
      Alert.alert("Upload Failed", err?.response?.data?.message || err?.message || "Could not upload one or more attachments.");
    } finally {
      setUploading(false);
    }
  };

  const getTitle = () => {
    if (normalizedActionType === "in_process") return "Mark In-Process";
    if (normalizedActionType === "late_complete") return "Mark Late Complete";
    if (normalizedActionType === "follow_up") return "Add Follow-up";
    return "Mark Complete";
  };

  const getButtonText = () => {
    if (normalizedActionType === "in_process") return "Start Task";
    if (normalizedActionType === "late_complete") return "Late Complete";
    if (normalizedActionType === "follow_up") return "Submit Follow-up";
    return "Complete Task";
  };

  const getButtonColor = () => {
    if (normalizedActionType === "in_process") return "#3b82f6";
    if (normalizedActionType === "late_complete") return "#f97316";
    if (normalizedActionType === "follow_up") return "#0d9488";
    return "#10b981";
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {normalizedActionType === "late_complete" && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.warningText}>
                  This task is overdue. Marking it complete now will record the delay.
                </Text>
              </View>
            )}

            {(normalizedActionType === "in_process" || normalizedActionType === "follow_up") && (
              <View style={styles.field}>
                <Text style={styles.label}>Next Follow-up Date &amp; Time *</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1.4, marginRight: 8 }}>
                    <AppDatePicker
                      value={followUpDate}
                      onChangeText={setFollowUpDate}
                      placeholder="Select date"
                      compact
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppTimePicker
                      value={followUpTime}
                      onChangeText={setFollowUpTime}
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>{normalizedActionType === "in_process" ? "Remarks / Progress" : "Final Remarks"} *</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Enter your remarks here..."
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Attachments</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <TouchableOpacity style={[styles.attachBtn, { flex: 1, marginRight: 8, marginTop: 0 }]} onPress={handlePickAttachment} disabled={uploading || loading || isRecording}>
                  <Ionicons name="attach-outline" size={18} color="#C2410C" />
                  <Text style={styles.attachBtnText}>Attach File</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.attachBtn, { paddingHorizontal: 16, marginTop: 0 }]} onPress={isRecording ? stopRecording : startRecording} disabled={uploading || loading}>
                  <Ionicons name="mic" size={18} color={isRecording ? "#ef4444" : "#C2410C"} />
                  {isRecording && <Text style={{marginLeft: 4, color: "#ef4444"}}>{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</Text>}
                </TouchableOpacity>
              </View>

              {attachments.map((file, index) => (
                <View key={index} style={styles.attachRow}>
                  {file.fileType?.startsWith('image') ? (
                    <Image source={{ uri: file.uri || file.fileUrl }} style={{ width: 32, height: 32, borderRadius: 4, marginRight: 8 }} />
                  ) : file.fileType?.startsWith('audio') ? (
                    <TouchableOpacity onPress={() => playAudioPreview(file.uri || file.fileUrl, index)} style={{ marginRight: 8 }}>
                      <Ionicons name={(isPlayingAudio && playingIndex === index) ? "pause-circle" : "play-circle"} size={28} color="#C2410C" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="document-text" size={24} color="#64748b" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.attachName} numberOfLines={1}>{decodeURIComponent(file.fileName || "Attachment")}</Text>
                  <TouchableOpacity onPress={() => removeAttachment(index)}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: getButtonColor() }, (loading || uploading) && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading || uploading}
            >
              {loading || uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{getButtonText()}</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  warningText: {
    marginLeft: 8,
    color: "#b91c1c",
    fontSize: 13,
    flex: 1,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    minHeight: 100,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  attachBtnText: {
    color: "#C2410C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  attachName: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.7,
  },
});

export default TaskActionModal;
