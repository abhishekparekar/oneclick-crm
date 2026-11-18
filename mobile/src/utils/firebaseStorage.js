import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

export const uploadSelfieToFirebase = async (uri, userId) => {
  if (!uri) return null;
  // If already an HTTP/HTTPS URL, no need to re-upload
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  try {
    const timestamp = Date.now();
    const fileName = `selfies/${userId}_${timestamp}.jpg`;
    const storageRef = ref(storage, fileName);

    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob, {
      contentType: "image/jpeg",
    });
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading to Firebase:", error?.message || error);
    // Graceful fallback: If direct Firebase upload fails on mobile network,
    // convert the local compressed photo to base64 so backend can upload it without failing user punch
    try {
      // 1. Try expo-file-system
      const FileSystem = require("expo-file-system");
      if (FileSystem && FileSystem.readAsStringAsync) {
        const b64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType?.Base64 || "base64",
        });
        if (b64) {
          return `data:image/jpeg;base64,${b64}`;
        }
      }
    } catch (_) {}

    try {
      // 2. Fallback to react-native-fs
      const RNFS = require("react-native-fs");
      const cleanPath = uri.replace(/^file:\/\//, "");
      const b64 = await RNFS.readFile(cleanPath, "base64");
      if (b64) {
        return `data:image/jpeg;base64,${b64}`;
      }
    } catch (_) {}
    return null;
  }
};
