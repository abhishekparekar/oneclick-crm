/**
 * Safely parses any date/datetime representation into a Date object
 * strictly respecting the intended Asia/Kolkata (IST = UTC+05:30) timezone.
 *
 * Handles:
 * 1. ISO strings with explicit timezone (ends with Z or +/-offset)
 * 2. HTML5 datetime-local ("YYYY-MM-DDTHH:mm[:ss]") -> interpreted as Asia/Kolkata (+05:30)
 * 3. Space-separated ("YYYY-MM-DD HH:mm[:ss]") -> interpreted as Asia/Kolkata (+05:30)
 * 4. Date-only ("YYYY-MM-DD") -> defaulted to 10:00 AM IST
 * 5. DD/MM/YYYY or DD-MM-YYYY (with optional HH:mm[:ss]) -> interpreted as Asia/Kolkata (+05:30)
 * 6. Date instance, timestamp number, or fallback
 */
const parseDateTimeIST = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Case 1: If string explicitly specifies timezone (ends with 'Z' or has +HH:mm / -HH:mm offset)
  // e.g. "2026-09-28T09:00:00.000Z" or "2026-09-28T14:30:00+05:30"
  if (/Z$|[+-]\d{2}:?\d{2}$/i.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // Case 2: Standard HTML5 datetime-local "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm[:ss]"
  const isoLocalMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (isoLocalMatch) {
    const [_, y, m, d, hh, mm, ss] = isoLocalMatch;
    const sec = ss || "00";
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:${sec}+05:30`);
  }

  // Case 3: Date-only "YYYY-MM-DD" -> default to 10:00 AM IST
  const yyyymmddMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmddMatch) {
    const [_, y, m, d] = yyyymmddMatch;
    return new Date(`${y}-${m}-${d}T10:00:00+05:30`);
  }

  // Case 4: DD/MM/YYYY or DD-MM-YYYY with optional time
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ddmmyyyyMatch) {
    const [_, day, month, year, hh, mm, ss] = ddmmyyyyMatch;
    const pad = (v) => String(v).padStart(2, "0");
    const h = hh !== undefined ? pad(hh) : "10";
    const m = mm !== undefined ? pad(mm) : "00";
    const s = ss !== undefined ? pad(ss) : "00";
    return new Date(`${year}-${pad(month)}-${pad(day)}T${h}:${m}:${s}+05:30`);
  }

  // Fallback
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Format a Date or date string to Indian Standard Time (IST) strings for display / notification
 */
const formatISTDateTime = (dateVal) => {
  if (!dateVal) return { dateStr: "", timeStr: "", fullStr: "" };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { dateStr: "", timeStr: "", fullStr: "" };

  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const dateStr = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return {
    dateStr,
    timeStr,
    fullStr: `${dateStr} at ${timeStr}`,
  };
};

module.exports = {
  parseDateTimeIST,
  formatISTDateTime,
};
