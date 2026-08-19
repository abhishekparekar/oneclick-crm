/**
 * PhotoPickerField — reusable image picker component
 * Tap to open gallery → upload to Firebase Storage → return download URL
 *
 * Props:
 *   photo         {string}   current URL (empty = no photo)
 *   onPhotoChange {fn}       called with new Firebase download URL
 *   label         {string}   optional label (default "PROFILE PHOTO")
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

const PhotoPickerField = ({ photo, onPhotoChange, label = "PROFILE PHOTO" }) => {
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo gallery.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const response = await fetch(result.assets[0].uri);
      const blob     = await response.blob();
      const fileName = `profile_photos/${Date.now()}.jpg`;
      const sRef     = ref(storage, fileName);
      await uploadBytes(sRef, blob);
      const url = await getDownloadURL(sRef);
      onPhotoChange(url);
    } catch (err) {
      console.error("PhotoPickerField upload error:", err);
      Alert.alert("Upload Failed", "Could not upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePick}
        activeOpacity={0.8}
        disabled={uploading}
      >
        {uploading ? (
          /* Uploading state */
          <View style={styles.inner}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        ) : photo ? (
          /* Photo selected state */
          <View style={styles.inner}>
            <Image source={{ uri: photo }} style={styles.preview} />
            <View style={styles.changeBtn}>
              <Ionicons name="camera-outline" size={13} color="#2563eb" style={{ marginRight: 5 }} />
              <Text style={styles.changeBtnText}>Change Photo</Text>
            </View>
          </View>
        ) : (
          /* Empty state */
          <View style={styles.inner}>
            <View style={styles.placeholder}>
              <Ionicons name="person-circle-outline" size={54} color="#cbd5e1" />
            </View>
            <View style={styles.selectBtn}>
              <Ionicons name="image-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.selectBtnText}>Choose from Gallery</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
  },
  inner:     { alignItems: "center" },
  preview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#bfdbfe",
  },
  placeholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  changeBtnText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },
  uploadingText: { color: "#64748b", fontSize: 13, fontWeight: "600", marginTop: 8 },
});

export default PhotoPickerField;
