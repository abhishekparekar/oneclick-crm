import { Linking, Alert } from "react-native";
import RNFS from "react-native-fs";
import * as Sharing from "expo-sharing";
import api, { getApiBaseUrl } from "../api/api";

export const SUPPORTED_DOCUMENT_MIMES = [
  "*/*",
  "application/pdf",
  "image/*",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const resolveDocumentUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Handle relative URLs
  const base = api.defaults.baseURL || getApiBaseUrl();
  const serverRoot = base.replace(/\/api\/?$/, "");
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${serverRoot}${cleanPath}`;
};

export const getMimeTypeFromExtension = (ext) => {
  const e = (ext || "").toLowerCase().replace(/^\./, "");
  switch (e) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "txt":
      return "text/plain";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
};

export const getFileIconMeta = (fileName = "", fileType = "") => {
  const ext = (fileName || "").split("?")[0].split(".").pop().toLowerCase();
  const type = (fileType || "").toLowerCase();

  if (ext === "pdf" || type.includes("pdf")) {
    return {
      icon: "document-text",
      color: "#DC2626",
      bg: "#FEE2E2",
      label: "PDF",
    };
  }
  if (
    ["doc", "docx"].includes(ext) ||
    type.includes("word") ||
    type.includes("officedocument.wordprocessingml")
  ) {
    return {
      icon: "document-text",
      color: "#2563EB",
      bg: "#DBEAFE",
      label: ext.toUpperCase() || "DOC",
    };
  }
  if (
    ["xls", "xlsx", "csv"].includes(ext) ||
    type.includes("excel") ||
    type.includes("spreadsheetml") ||
    type.includes("csv")
  ) {
    return {
      icon: "grid",
      color: "#059669",
      bg: "#D1FAE5",
      label: ext.toUpperCase() || "XLS",
    };
  }
  if (
    ["ppt", "pptx"].includes(ext) ||
    type.includes("powerpoint") ||
    type.includes("presentationml")
  ) {
    return {
      icon: "easel",
      color: "#EA580C",
      bg: "#FFEDD5",
      label: ext.toUpperCase() || "PPT",
    };
  }
  if (
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(ext) ||
    type.includes("image")
  ) {
    return {
      icon: "image",
      color: "#7C3AED",
      bg: "#EDE9FE",
      label: "IMG",
    };
  }
  if (["txt", "log"].includes(ext) || type.includes("text")) {
    return {
      icon: "document-text-outline",
      color: "#475569",
      bg: "#F1F5F9",
      label: "TXT",
    };
  }
  return {
    icon: "document-attach-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
    label: ext ? ext.substring(0, 4).toUpperCase() : "DOC",
  };
};

export const openLeadDocument = async (docUrl, docName = "", docType = "") => {
  if (!docUrl) {
    Alert.alert("Notice", "Document URL is not available.");
    return;
  }

  const fullUrl = resolveDocumentUrl(docUrl);
  const cleanName = (docName || fullUrl.split("/").pop() || "Document").split("?")[0];
  const ext = (
    cleanName.includes(".")
      ? cleanName.split(".").pop()
      : (docType || "").split("/").pop() || ""
  ).toLowerCase();

  const isImage =
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(ext) ||
    (docType || "").includes("image");
  const isOfficeOrPdf =
    [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "csv",
      "ppt",
      "pptx",
      "txt",
    ].includes(ext) ||
    (docType || "").includes("pdf") ||
    (docType || "").includes("officedocument") ||
    (docType || "").includes("msword") ||
    (docType || "").includes("excel");

  // Local file
  if (fullUrl.startsWith("file://")) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fullUrl, {
          mimeType: getMimeTypeFromExtension(ext),
          dialogTitle: `Open ${cleanName}`,
        });
      } else {
        await Linking.openURL(fullUrl);
      }
    } catch (err) {
      Alert.alert("Notice", "Could not open local file: " + (err?.message || err));
    }
    return;
  }

  // For images, open directly
  if (isImage) {
    try {
      await Linking.openURL(fullUrl);
    } catch (_) {
      Alert.alert("Notice", `Image URL: ${fullUrl}`);
    }
    return;
  }

  // Handler to download to cache and open in native apps (Word, Excel, PDF viewer)
  const openWithNativeApp = async () => {
    try {
      const sanitizedFileName = cleanName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const targetFileName = sanitizedFileName.includes(".")
        ? sanitizedFileName
        : `${sanitizedFileName}.${ext || "pdf"}`;
      const localFilePath = `${RNFS.CachesDirectoryPath}/${targetFileName}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: fullUrl,
        toFile: localFilePath,
      }).promise;

      if (downloadResult.statusCode === 200 || downloadResult.statusCode === 206) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localFilePath, {
            mimeType: getMimeTypeFromExtension(ext),
            dialogTitle: `Open ${targetFileName}`,
          });
        } else {
          await Linking.openURL(`file://${localFilePath}`);
        }
      } else {
        openOnlineViewer();
      }
    } catch (err) {
      console.warn("[documentViewer] openWithNativeApp fallback:", err?.message || err);
      openOnlineViewer();
    }
  };

  // Handler to view in browser via Google Docs Viewer
  const openOnlineViewer = async () => {
    try {
      const viewerUrl = isOfficeOrPdf
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`
        : fullUrl;
      await Linking.openURL(viewerUrl);
    } catch (err) {
      Linking.openURL(fullUrl).catch(() => {
        Alert.alert("Document URL", fullUrl);
      });
    }
  };

  // If it's a PDF, Word, Excel, PPT document, offer choices:
  // 1) Open with App (Word / Excel / PDF reader)
  // 2) View Online (Google Docs Viewer in Browser)
  if (isOfficeOrPdf) {
    Alert.alert(
      "Open Document",
      `${cleanName}\n\nHow would you like to open this file?`,
      [
        {
          text: "Open with App",
          onPress: openWithNativeApp,
        },
        {
          text: "View Online",
          onPress: openOnlineViewer,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
    return;
  }

  // Fallback for any other file type
  try {
    await Linking.openURL(fullUrl);
  } catch (_) {
    openWithNativeApp();
  }
};

export const openDocument = openLeadDocument;

export default {
  SUPPORTED_DOCUMENT_MIMES,
  resolveDocumentUrl,
  getMimeTypeFromExtension,
  getFileIconMeta,
  openLeadDocument,
  openDocument,
};
