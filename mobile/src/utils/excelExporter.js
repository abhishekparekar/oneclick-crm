import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import RNFS from "react-native-fs";
import { Alert } from "react-native";

/**
 * Export data to an Excel (.xlsx) file and launch system share sheet.
 * @param {Object} options
 * @param {string} options.fileName - e.g. "Attendance_Report_2026-09-11"
 * @param {string} options.sheetName - e.g. "Attendance"
 * @param {Array<string>} options.headers - table headers
 * @param {Array<Array<any>>} options.rows - table row arrays
 * @param {Array<Array<string>>} [options.summaryRows] - optional summary key-value rows
 */
export const exportToExcel = async ({
  fileName = "Report",
  sheetName = "Sheet1",
  headers = [],
  rows = [],
  summaryRows = [],
  sheets = null,
}) => {
  try {
    // Check sharing availability if supported
    if (typeof Sharing?.isAvailableAsync === "function") {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert("Notice", "Sharing is not available on this device.");
          return false;
        }
      } catch (_) {
        // Continue if check fails
      }
    }

    const wb = XLSX.utils.book_new();

    const sheetList =
      Array.isArray(sheets) && sheets.length > 0
        ? sheets
        : [{ sheetName, headers, rows, summaryRows }];

    sheetList.forEach((s, sIdx) => {
      const aoaData = [];
      if (s.summaryRows && s.summaryRows.length > 0) {
        aoaData.push(...s.summaryRows);
        aoaData.push([]); // blank separator
      }
      if (s.headers && s.headers.length > 0) {
        aoaData.push(s.headers);
      }
      if (s.rows && s.rows.length > 0) {
        aoaData.push(...s.rows);
      }

      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      // Calculate approximate column widths
      if (s.headers && s.headers.length > 0) {
        const colWidths = s.headers.map((h, i) => {
          let maxLen = String(h || "").length;
          (s.rows || []).forEach((r) => {
            const val = r[i] !== undefined && r[i] !== null ? String(r[i]) : "";
            if (val.length > maxLen) maxLen = val.length;
          });
          return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
        });
        ws["!cols"] = colWidths;
      }

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        (s.sheetName || `Sheet${sIdx + 1}`).substring(0, 31)
      );
    });

    const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const cleanFileName = `${fileName.replace(/[^a-zA-Z0-9_\-]/g, "_")}.xlsx`;

    const baseDir =
      RNFS?.CachesDirectoryPath ||
      RNFS?.DocumentDirectoryPath ||
      RNFS?.TemporaryDirectoryPath;

    if (!baseDir) {
      throw new Error("Local storage directory is unavailable.");
    }

    const filePath = `${baseDir}/${cleanFileName}`;
    await RNFS.writeFile(filePath, wbout, "base64");

    const shareUri = filePath.startsWith("file://") ? filePath : `file://${filePath}`;

    if (typeof Sharing?.shareAsync === "function") {
      await Sharing.shareAsync(shareUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Export ${fileName}`,
        UTI: "com.microsoft.excel.xlsx",
      });
    }

    return true;
  } catch (error) {
    console.error("[excelExporter] Error generating Excel:", error);
    Alert.alert("Export Error", error?.message || "Failed to generate Excel file.");
    return false;
  }
};

export default exportToExcel;

