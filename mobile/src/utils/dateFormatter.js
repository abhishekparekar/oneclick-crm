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
 * Simple validation pattern to check if a string matches DD/MM/YYYY.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isValidDDMMYYYY = (dateStr) => {
  if (!dateStr) return false;
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  return regex.test(String(dateStr).trim());
};
