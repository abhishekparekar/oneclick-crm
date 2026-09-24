import { getApiBaseUrl } from "../api/api";

export const resolveDocumentUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const base = getApiBaseUrl();
  const serverRoot = base.replace(/\/api\/?$/, "");
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${serverRoot}${cleanPath}`;
};

export const getFileMeta = (fileName = "", fileType = "") => {
  const cleanName = (fileName || "").split("?")[0];
  const ext = (
    cleanName.includes(".")
      ? cleanName.split(".").pop()
      : (fileType || "").split("/").pop() || ""
  ).toLowerCase();
  const type = (fileType || "").toLowerCase();

  if (ext === "pdf" || type.includes("pdf")) {
    return {
      type: "pdf",
      label: "PDF",
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-200 dark:border-rose-800",
      isOfficeOrPdf: true,
      isImage: false,
    };
  }
  if (
    ["doc", "docx"].includes(ext) ||
    type.includes("word") ||
    type.includes("officedocument.wordprocessingml")
  ) {
    return {
      type: "word",
      label: ext.toUpperCase() || "DOCX",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-200 dark:border-blue-800",
      isOfficeOrPdf: true,
      isImage: false,
    };
  }
  if (
    ["xls", "xlsx", "csv"].includes(ext) ||
    type.includes("excel") ||
    type.includes("spreadsheetml") ||
    type.includes("csv")
  ) {
    return {
      type: "excel",
      label: ext.toUpperCase() || "XLSX",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-800",
      isOfficeOrPdf: true,
      isImage: false,
    };
  }
  if (
    ["ppt", "pptx"].includes(ext) ||
    type.includes("powerpoint") ||
    type.includes("presentationml")
  ) {
    return {
      type: "ppt",
      label: ext.toUpperCase() || "PPTX",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/40",
      border: "border-orange-200 dark:border-orange-800",
      isOfficeOrPdf: true,
      isImage: false,
    };
  }
  if (
    ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext) ||
    type.includes("image")
  ) {
    return {
      type: "image",
      label: ext.toUpperCase() || "IMG",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      border: "border-purple-200 dark:border-purple-800",
      isOfficeOrPdf: false,
      isImage: true,
    };
  }
  if (["txt", "log"].includes(ext) || type.includes("text")) {
    return {
      type: "text",
      label: "TXT",
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
      border: "border-slate-200 dark:border-slate-700",
      isOfficeOrPdf: true,
      isImage: false,
    };
  }
  return {
    type: "other",
    label: ext ? ext.slice(0, 4).toUpperCase() : "FILE",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    isOfficeOrPdf: false,
    isImage: false,
  };
};

export const openDocument = (docUrl, docName = "", docType = "") => {
  const fullUrl = resolveDocumentUrl(docUrl);
  if (!fullUrl) return;

  const meta = getFileMeta(docName, docType);
  const isPublicUrl =
    fullUrl.startsWith("https://") &&
    !fullUrl.includes("localhost") &&
    !fullUrl.includes("127.0.0.1");

  // For Word, Excel, PPT on public HTTPS, Google Docs viewer provides online preview
  if (meta.isOfficeOrPdf && !meta.isImage && meta.type !== "pdf" && isPublicUrl) {
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  } else {
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }
};

export default {
  resolveDocumentUrl,
  getFileMeta,
  openDocument,
};
