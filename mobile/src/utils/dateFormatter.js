/**
 * Formats any date input (String, Date Object, or Timestamp) to standard DD/MM/YYYY format.
 * @param {string|Date|number} dateInput 
 * @returns {string|null} Format: DD/MM/YYYY
 */
export const formatDateToDDMMYYYY = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parses a DD/MM/YYYY string to an ISO date string (YYYY-MM-DD) suitable for database storage.
 * If invalid or already formatted differently, returns the input string as-is.
 * @param {string} dateStr 
 * @returns {string} Format: YYYY-MM-DD
 */
export const parseDDMMYYYYToISO = (dateStr) => {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim();
  if (!cleaned.includes("/")) return cleaned;
  
  const parts = cleaned.split("/");
  if (parts.length === 3) {
    const day = parts[0].trim().padStart(2, '0');
    const month = parts[1].trim().padStart(2, '0');
    const year = parts[2].trim();
    
    // Ensure all parts are numeric and year is 4 digits
    if (/^\d+$/.test(day) && /^\d+$/.test(month) && /^\d{4}$/.test(year)) {
      return `${year}-${month}-${day}`;
    }
  }
  return cleaned;
};

/**
 * Formats a time string (HH:MM or Date or ISO string) to 12-hour AM/PM format.
 * @param {string|Date|number} timeInput
 * @returns {string} Format: HH:MM AM/PM
 */
export const formatTimeToHHMMA = (timeInput) => {
  if (!timeInput) return "";
  if (typeof timeInput === "string" && timeInput.includes(":") && !timeInput.includes("T")) {
    const parts = timeInput.split(":");
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeInput;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  }
  const d = new Date(timeInput);
  if (!isNaN(d.getTime())) {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  }
  return String(timeInput);
};

/**
 * Formats any date and optional time to DD/MM/YYYY hh:mm AM/PM format.
 * @param {string|Date|number} dateInput
 * @param {string} [timeInput]
 * @returns {string} Format: DD/MM/YYYY or DD/MM/YYYY hh:mm AM/PM
 */
export const formatDateTimeToDDMMYYYY = (dateInput, timeInput) => {
  if (!dateInput) return "-";
  const dateFormatted = formatDateToDDMMYYYY(dateInput);
  if (!dateFormatted) return "-";
  if (timeInput) {
    return `${dateFormatted} • ${formatTimeToHHMMA(timeInput)}`;
  }
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${dateFormatted} • ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  }
  return dateFormatted;
};

/**
 * Combines a DD/MM/YYYY date and HH:MM time string into an ISO string.
 * @param {string} dateStr Format DD/MM/YYYY
 * @param {string} timeStr Format HH:MM
 * @returns {string|null} ISO 8601 string
 */
export const combineDateAndTimeToISO = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    let hour = 10;
    let minute = 0;
    if (timeStr && String(timeStr).includes(":")) {
      const [h, m] = String(timeStr).split(":");
      hour = parseInt(h, 10) || 10;
      minute = parseInt(m, 10) || 0;
    }
    const d = new Date(year, month, day, hour, minute, 0);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
};

/**
 * Simple validation pattern to check if a string matches DD/MM/YYYY.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isValidDDMMYYYY = (dateStr) => {
  if (!dateStr) return false;
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  return regex.test(String(dateStr).trim());
};
