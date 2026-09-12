/**
 * Avatar & Name Utilities
 * Crash-proof helpers for extracting initials and photo URLs from user/employee objects.
 */

export const getInitials = (name, fallback = "U") => {
  if (!name || typeof name !== "string") return fallback;
  const cleaned = name.trim();
  if (!cleaned) return fallback;

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
    const firstChar = parts[0][0] || "";
    const lastChar = parts[parts.length - 1][0] || "";
    const res = (firstChar + lastChar).toUpperCase();
    return res || fallback;
  }
  if (parts.length === 1 && parts[0]) {
    return parts[0].slice(0, 2).toUpperCase() || fallback;
  }
  return fallback;
};

export const getSafePhotoUrl = (photo) => {
  if (!photo) return "";
  if (typeof photo === "string") return photo.trim();
  if (typeof photo === "object") {
    return typeof photo.url === "string" ? photo.url.trim() : (typeof photo.uri === "string" ? photo.uri.trim() : "");
  }
  return "";
};
