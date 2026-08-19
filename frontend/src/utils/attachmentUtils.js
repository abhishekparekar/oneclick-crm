/**
 * Utility functions for document/attachment viewing, downloading, and media detection across the application.
 */

export const isImageFile = (file = {}) => {
  const url = file.fileUrl || file.url || file.fileData || "";
  const type = file.fileType || file.type || "";
  const name = file.fileName || file.name || "";

  if (type.startsWith("image/")) return true;
  if (url.startsWith("data:image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name || url);
};

export const getFileName = (file = {}) => {
  return file.fileName || file.name || "Attachment";
};

export const downloadAttachment = (file = {}) => {
  const url = file.fileUrl || file.url || file.fileData || "";
  const fileName = getFileName(file);
  if (!url) return;

  // Base64 Data URI Handler
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(";base64,");
      if (parts.length === 2) {
        const contentType = parts[0].replace("data:", "");
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }
    } catch (err) {
      console.error("Failed to parse base64 data url for download:", err);
    }
  }

  // Standard HTTP/HTTPS fallback
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
