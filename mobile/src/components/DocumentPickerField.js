import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

const DocumentPickerField = ({ documentUrl, onDocumentChange, label }) => {
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setUploading(true);

      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const fileExt = file.name.split('.').pop() || "pdf";
      const fileName = `employee_documents/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const sRef = ref(storage, fileName);
      await uploadBytes(sRef, blob);
      const url = await getDownloadURL(sRef);
      
      onDocumentChange(url);
    } catch (err) {
      console.error("DocumentPickerField upload error:", err);
      Alert.alert("Upload Failed", "Could not upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isUploaded = !!documentUrl;
  const isPdf = documentUrl && documentUrl.toLowerCase().includes(".pdf");

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.container, isUploaded && styles.containerUploaded]}
        onPress={handlePick}
        activeOpacity={0.8}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.innerRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        ) : isUploaded ? (
          <View style={styles.innerRow}>
            <Ionicons name={isPdf ? "document-text" : "image"} size={24} color="#C2410C" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadedText}>Document Uploaded</Text>
              <Text style={styles.changeText}>Tap to change</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#C2410C" />
          </View>
        ) : (
          <View style={styles.innerRow}>
            <View style={styles.iconBox}>
              <Ionicons name="cloud-upload-outline" size={20} color="#2563eb" />
            </View>
            <Text style={styles.selectText}>Tap to upload document</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  container: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    padding: 14,
  },
  containerUploaded: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderStyle: "solid",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  uploadedText: {
    color: "#C2410C",
    fontSize: 13.5,
    fontWeight: "700",
  },
  changeText: {
    color: "#F97316",
    fontSize: 11,
    marginTop: 2,
  },
  uploadingText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
});

export default DocumentPickerField;
