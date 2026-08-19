import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { uploadMediaFileApi } from "../api/taskService";

export default function TaskAttachmentPicker({ attachments = [], onChange, label = "Attachments" }) {
  const [uploading, setUploading] = useState(false);
  const recordingRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const [stagedFiles, setStagedFiles] = useState([]);
  const [sound, setSound] = useState(null);
  const [playingUri, setPlayingUri] = useState(null);

  React.useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const playAudio = async (uri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      if (playingUri === uri) {
        setPlayingUri(null);
        setSound(null);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setPlayingUri(null);
          }
        }
      );
      setSound(newSound);
      setPlayingUri(uri);
    } catch (err) {
      Alert.alert("Error", "Failed to play audio preview.");
      setPlayingUri(null);
    }
  };

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: "*/*",
      });
      if (result.canceled) return;

      const newStaged = (result.assets || []).map(asset => ({
        uri: asset.uri,
        name: asset.name || "attachment",
        type: asset.mimeType || "application/octet-stream",
      }));
      setStagedFiles(prev => [...prev, ...newStaged]);
    } catch (err) {
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert("Permission Required", "Please grant microphone permissions to record audio.");
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      const rec = recordingRef.current;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;

      if (uri) {
        const ext = uri.split('.').pop() || 'm4a';
        setStagedFiles(prev => [...prev, {
          uri,
          name: `voice_note_${Date.now()}.${ext}`,
          type: `audio/${ext === 'm4a' ? 'mp4' : ext}`
        }]);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const uploadStagedFile = async (file, index) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      });
      
      const res = await uploadMediaFileApi(formData);
      const data = res.data || res;
      if (data.success) {
        onChange([...attachments, {
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType,
        }]);
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Upload Failed", "Could not upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handlePick} disabled={uploading || isRecording}>
          <Ionicons name="add-circle-outline" size={18} color="#C2410C" />
          <Text style={styles.btnText}>Add media or document</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.recordBtn, isRecording && styles.recordingActive]} 
          onPress={isRecording ? stopRecording : startRecording}
          disabled={uploading && !isRecording}
        >
          {isRecording ? (
            <Ionicons name="stop-circle" size={24} color="#ef4444" />
          ) : (
            <Ionicons name="mic" size={24} color="#C2410C" />
          )}
        </TouchableOpacity>
      </View>
      
      {isRecording && (
        <Text style={styles.recordingText}>Recording voice note...</Text>
      )}

      {/* Staged Files (Ready to Upload) */}
      {stagedFiles.map((file, index) => (
        <View key={`staged-${index}`} style={styles.stagedRow}>
          <View style={{flex: 1, marginRight: 8}}>
            <Text style={styles.name} numberOfLines={1}>{file.name}</Text>
            {file.type && file.type.startsWith('audio') && (
              <TouchableOpacity onPress={() => playAudio(file.uri)} style={{ marginTop: 4 }}>
                <Text style={{color: playingUri === file.uri ? '#ef4444' : '#C2410C', fontSize: 11, fontWeight: 'bold'}}>
                  {playingUri === file.uri ? '⏹ Stop Preview' : '▶ Play Preview'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.uploadBtn, uploading && { opacity: 0.5 }]} 
            onPress={() => uploadStagedFile(file, index)} 
            disabled={uploading}
          >
            <Ionicons name="cloud-upload" size={14} color="#fff" style={{marginRight: 4}} />
            <Text style={{color: 'white', fontSize: 11, fontWeight: 'bold'}}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{marginLeft: 12}} onPress={() => setStagedFiles(prev => prev.filter((_, i) => i !== index))}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Uploaded Files */}
      {attachments.map((file, index) => (
        <View key={`${file.fileUrl}-${index}`} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{decodeURIComponent(file.fileName || "Attachment")}</Text>
          <TouchableOpacity onPress={() => onChange(attachments.filter((_, i) => i !== index))}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  btn: {
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
  recordBtn: {
    width: 45,
    height: 45,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  recordingActive: {
    borderColor: "#ef4444",
    backgroundColor: "#fee2e2",
  },
  btnText: { color: "#C2410C", fontSize: 13, fontWeight: "600", flex: 1 },
  recordingText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
    textAlign: "right"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  stagedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a"
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C2410C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  name: { flex: 1, fontSize: 12, color: "#334155", marginRight: 8 },
});
