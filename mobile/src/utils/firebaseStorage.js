import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

export const uploadSelfieToFirebase = async (base64Uri, userId) => {
  if (!base64Uri) return null;
  try {
    const timestamp = Date.now();
    const fileName = `selfies/${userId}_${timestamp}.jpg`;
    const storageRef = ref(storage, fileName);

    const response = await fetch(base64Uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading to Firebase:", error);
    throw error;
  }
};
