import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReportHeader from "../../components/ReportHeader";
import {
  getCompanyAttendanceApi,
  getCompanyEmployeesApi,
  getDepartmentsApi,
} from "../../api/companyService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Present", value: "present" },
  { label: "Late Arrival", value: "late" },
  { label: "Absent", value: "absent" },
  { label: "Half Day", value: "half-day" },
  { label: "On Leave", value: "on-leave" },
  { label: "Weekly Off", value: "weekly-off" },
  { label: "Holiday", value: "holiday" },
];

const STATUS_COLORS = {
  present: { bg: "#ECFDF5", text: "#059669", dot: "#10B981", border: "#A7F3D0" },
  late: { bg: "#FEF3C7", text: "#D97706", dot: "#F59E0B", border: "#FDE68A" },
  absent: { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", border: "#FECACA" },
  "half-day": { bg: "#F5F3FF", text: "#7C3AED", dot: "#8B5CF6", border: "#DDD6FE" },
  half_day: { bg: "#F5F3FF", text: "#7C3AED", dot: "#8B5CF6", border: "#DDD6FE" },
  "on-leave": { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6", border: "#BFDBFE" },
  on_leave: { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6", border: "#BFDBFE" },
  paid_leave: { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6", border: "#BFDBFE" },
  unpaid_leave: { bg: "#EEF2FF", text: "#4F46E5", dot: "#6366F1", border: "#C7D2FE" },
  holiday: { bg: "#F1F5F9", text: "#475569", dot: "#64748B", border: "#CBD5E1" },
  weekly_off: { bg: "#F1F5F9", text: "#475569", dot: "#64748B", border: "#CBD5E1" },
  "weekly-off": { bg: "#F1F5F9", text: "#475569", dot: "#64748B", border: "#CBD5E1" },
};

const fmtTime = (t) => {
  if (!t) return "—";
  try {
    return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return "—";
  }
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (_) {
    return d;
  }
};

const AttendanceReportScreen = () => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // View mode: "monthly" | "daily"
  const [viewMode, setViewMode] = useState("monthly");

  // Filters
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [date, setDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Modals for filters
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  // Accordion state: expanded employee ID for monthly punch logs
  const [expandedEmpId, setExpandedEmpId] = useState(null);

  // Data & States
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Fetch data
  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params = {};
        if (viewMode === "daily") {
          params.date = date;
        } else {
          if (month) params.month = Number(month);
          if (year) params.year = Number(year);
        }

        const [attRes, empRes, deptRes] = await Promise.all([
          getCompanyAttendanceApi(params).catch(() => ({ data: { attendance: [] } })),
          getCompanyEmployeesApi({ limit: 1000 }).catch(() => ({ data: { employees: [] } })),
          getDepartmentsApi().catch(() => ({ data: { departments: [] } })),
        ]);

        setAttendanceRecords(attRes.data?.attendance || []);
        setEmployees(empRes.data?.employees || []);
        const depts = deptRes.data?.departments || deptRes.data || [];
        setDepartments(Array.isArray(depts) ? depts : []);
      } catch (err) {
        console.warn("[AttendanceReportScreen] Fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [viewMode, date, month, year]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calendar days in the active month
  const daysInMonth = useMemo(() => {
    return new Date(
      Number(year) || now.getFullYear(),
      Number(month) || now.getMonth() + 1,
      0
    ).getDate();
  }, [month, year]);

  // ── Monthly Employee-Wise Attendance Aggregation (Source of truth matching Web) ──
  const monthlyByEmp = useMemo(() => {
    const map = {};
    attendanceRecords.forEach((rec) => {
      const emp = rec.employeeId;
      if (!emp || !emp._id) return;
      const key = String(emp._id);

      if (!map[key]) {
        const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeName || "Employee";
        map[key] = {
          _id: emp._id,
          name: empName,
          code: emp.employeeCode || "—",
          dept: emp.departmentId?.name || emp.department || "General",
          deptId: emp.departmentId?._id || emp.departmentId,
          desig: emp.designationId?.name || emp.designation || "Staff",
          records: [],
          present: 0,
          late: 0,
          absent: 0,
          halfDay: 0,
          onLeave: 0,
          weeklyOff: 0,
          holiday: 0,
          overtime: 0,
          totalHours: 0,
        };
      }

      map[key].records.push(rec);
      const st = (rec.status || "absent").toLowerCase().replace(/_/g, "-");

      if (st === "present") {
        map[key].present++;
      } else if (st === "late") {
        map[key].late++;
        map[key].present++; // Late arrival counted as present day
      } else if (st === "absent") {
        map[key].absent++;
      } else if (st === "half-day") {
        map[key].halfDay++;
      } else if (["on-leave", "paid-leave", "unpaid-leave"].includes(st)) {
        map[key].onLeave++;
      } else if (st === "weekly-off") {
        map[key].weeklyOff++;
      } else if (st === "holiday") {
        map[key].holiday++;
      }

      const hrs = Number(rec.totalHours || 0);
      map[key].totalHours += hrs;
      if (hrs > 8) {
        map[key].overtime += hrs - 8;
      }
    });

    return Object.values(map)
      .map((emp) => {
        // Sort daily records ascending by date
        emp.records.sort((a, b) => ((a.date || "") < (b.date || "") ? -1 : 1));

        // Calculate working days: calendar days in month minus recorded weekly off and holidays
        const workingDays = Math.max(0, daysInMonth - emp.weeklyOff - emp.holiday);
        const effectiveWorkingDays =
          workingDays > 0
            ? workingDays
            : (emp.present + emp.absent + emp.halfDay + emp.onLeave) || daysInMonth;

        const attPct =
          effectiveWorkingDays > 0
            ? Math.min(
                100,
                Math.round(
                  ((emp.present + emp.halfDay * 0.5) / effectiveWorkingDays) * 100
                )
              )
            : 0;

        return {
          ...emp,
          workingDays: effectiveWorkingDays,
          attPct,
          overtime: Math.round(emp.overtime * 10) / 10,
          totalHours: Math.round(emp.totalHours * 10) / 10,
        };
      })
      .sort((a, b) => b.present - a.present);
  }, [attendanceRecords, daysInMonth]);

  // Filtered monthly employees according to search and department
  const filteredMonthlyEmps = useMemo(() => {
    return monthlyByEmp.filter((emp) => {
      const s = search.toLowerCase().trim();
      const matchesSearch =
        !s ||
        emp.name.toLowerCase().includes(s) ||
        emp.code.toLowerCase().includes(s);

      let matchesDept = true;
      if (departmentFilter !== "all") {
        matchesDept = String(emp.deptId) === String(departmentFilter);
      }
      return matchesSearch && matchesDept;
    });
  }, [monthlyByEmp, search, departmentFilter]);

  // Daily filtered records for Daily View mode
  const filteredDailyRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      const emp = rec.employeeId || {};
      const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeName || "";
      const empCode = emp.employeeCode || "";
      const s = search.toLowerCase().trim();

      const matchesSearch =
        !s || empName.toLowerCase().includes(s) || empCode.toLowerCase().includes(s);

      let matchesStatus = true;
      if (statusFilter !== "all") {
        const recStatus = (rec.status || "").toLowerCase().replace(/_/g, "-");
        const filterKey = statusFilter.toLowerCase().replace(/_/g, "-");
        if (filterKey === "on-leave") {
          matchesStatus = ["on-leave", "paid-leave", "unpaid-leave"].includes(recStatus);
        } else if (filterKey === "holiday") {
          matchesStatus = ["holiday", "weekly-off"].includes(recStatus);
        } else {
          matchesStatus = recStatus === filterKey;
        }
      }

      let matchesDept = true;
      if (departmentFilter !== "all") {
        const empDeptId = emp.departmentId?._id || emp.departmentId;
        matchesDept = String(empDeptId) === String(departmentFilter);
      }

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [attendanceRecords, search, statusFilter, departmentFilter]);

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    const totalActiveEmployees =
      employees.filter((e) => e.status === "active").length || monthlyByEmp.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let halfDay = 0;
    let onLeave = 0;
    let weeklyOff = 0;
    let holiday = 0;
    let totalOvertime = 0;

    monthlyByEmp.forEach((emp) => {
      present += emp.present;
      late += emp.late;
      absent += emp.absent;
      halfDay += emp.halfDay;
      onLeave += emp.onLeave;
      weeklyOff += emp.weeklyOff;
      holiday += emp.holiday;
      totalOvertime += emp.overtime;
    });

    const totalLogs = attendanceRecords.length;
    const avgRate =
      monthlyByEmp.length > 0
        ? Math.round(
            monthlyByEmp.reduce((acc, curr) => acc + curr.attPct, 0) /
              monthlyByEmp.length
          )
        : 0;

    return {
      totalEmployees: totalActiveEmployees,
      totalLogs,
      present,
      late,
      absent,
      halfDay,
      onLeave,
      weeklyOff,
      holiday,
      overtime: Math.round(totalOvertime * 10) / 10,
      avgRate,
    };
  }, [employees, monthlyByEmp, attendanceRecords]);

  // Daily stats
  const dailyStats = useMemo(() => {
    const totalActiveEmployees =
      employees.filter((e) => e.status === "active").length || employees.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let halfDay = 0;
    let onLeave = 0;
    let holidayOff = 0;

    filteredDailyRecords.forEach((r) => {
      const st = (r.status || "").toLowerCase().replace(/_/g, "-");
      if (st === "present") present++;
      else if (st === "late") {
        late++;
        present++;
      } else if (st === "absent") absent++;
      else if (st === "half-day") halfDay++;
      else if (["on-leave", "paid-leave", "unpaid-leave"].includes(st)) onLeave++;
      else if (["holiday", "weekly-off"].includes(st)) holidayOff++;
    });

    return {
      totalEmployees: totalActiveEmployees,
      totalRecords: filteredDailyRecords.length,
      present,
      late,
      absent,
      halfDay,
      onLeave,
      holidayOff,
    };
  }, [employees, filteredDailyRecords]);

  // ── Excel Export Handler (Two-Sheet Monthly & Formatted Daily) ──────────
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);

      const formatDateDDMMYYYY = (d) => {
        if (!d) return "—";
        try {
          const s = String(d).slice(0, 10);
          const parts = s.split("-");
          if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          const dt = new Date(d);
          if (!isNaN(dt.getTime())) {
            const day = String(dt.getDate()).padStart(2, "0");
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const y = dt.getFullYear();
            return `${day}/${m}/${y}`;
          }
          return d;
        } catch (_) {
          return d;
        }
      };

      if (viewMode === "monthly") {
        const periodLabel = `${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
        const fileName = `Attendance_Monthly_${periodLabel}`;

        const summaryRows = [
          ["Report", "Monthly Employee Attendance Summary Report"],
          ["Generated Date", new Date().toLocaleString("en-IN")],
          ["Period", `${month ? `Month ${month}` : "All Months"} / ${year || "All Years"}`],
          ["Calendar Days in Month", daysInMonth],
          ["Total Enrolled Staff", monthlyStats.totalEmployees],
          ["Filtered Staff Count", filteredMonthlyEmps.length],
          ["Total Present Count", monthlyStats.present],
          ["Total Late Count", monthlyStats.late],
          ["Total Absent Count", monthlyStats.absent],
          ["Total Half Day Count", monthlyStats.halfDay],
          ["Total Leaves Count", monthlyStats.onLeave],
          ["Total Weekly Off Count", monthlyStats.weeklyOff],
          ["Total Holiday Count", monthlyStats.holiday],
          ["Total Overtime", `${monthlyStats.overtime} hrs`],
          ["Average Attendance Rate", `${monthlyStats.avgRate}%`],
        ];

        // 1. Monthly Attendance Summary Sheet
        const summaryHeaders = [
          "#",
          "Employee Name",
          "Employee ID",
          "Department",
          "Designation",
          "Total Working Days",
          "Present Days",
          "Absent Days",
          "Half Days",
          "Leave Days",
          "Weekly Off Days",
          "Holiday Days",
          "Late Days",
          "Total Overtime",
          "Attendance %",
        ];

        const summaryDataRows = filteredMonthlyEmps.map((emp, idx) => [
          idx + 1,
          emp.name,
          emp.code,
          emp.dept,
          emp.desig,
          emp.workingDays,
          emp.present,
          emp.absent,
          emp.halfDay,
          emp.onLeave,
          emp.weeklyOff,
          emp.holiday,
          emp.late,
          emp.overtime > 0 ? `${emp.overtime} hrs` : "0.0 hrs",
          `${emp.attPct}%`,
        ]);

        // 2. Date-wise Attendance Details Sheet
        const detailHeaders = [
          "#",
          "Date",
          "Employee Name",
          "Employee ID",
          "Department",
          "Punch In",
          "Punch Out",
          "Attendance Status",
          "Late Time",
          "Working Hours",
          "Overtime",
        ];

        const filteredEmpIdSet = new Set(filteredMonthlyEmps.map((e) => String(e._id)));
        const detailRecords = attendanceRecords
          .filter((r) => r.employeeId && filteredEmpIdSet.has(String(r.employeeId._id || r.employeeId)))
          .sort((a, b) => ((a.date || "") < (b.date || "") ? -1 : 1));

        const detailDataRows = detailRecords.map((r, idx) => {
          const emp = r.employeeId || {};
          const empName =
            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeName || "Employee";
          const empCode = emp.employeeCode || "—";
          const deptName = emp.departmentId?.name || emp.department || "General";
          const rawStatus = (r.status || "absent").toLowerCase();
          const totalHrs = Number(r.totalHours) || 0;
          const otHrs = totalHrs > 8 ? (totalHrs - 8).toFixed(1) : "0.0";
          const lateText = rawStatus === "late" ? `${fmtTime(r.punchInTime)} (Late Arrival)` : "None";

          return [
            idx + 1,
            formatDateDDMMYYYY(r.date),
            empName,
            empCode,
            deptName,
            fmtTime(r.punchInTime),
            fmtTime(r.punchOutTime),
            rawStatus.toUpperCase().replace(/_/g, " "),
            lateText,
            `${totalHrs.toFixed(1)} hrs`,
            `${otHrs} hrs`,
          ];
        });

        await exportToExcel({
          fileName,
          sheets: [
            {
              sheetName: "Monthly Summary",
              summaryRows,
              headers: summaryHeaders,
              rows: summaryDataRows,
            },
            {
              sheetName: "Date-wise Details",
              headers: detailHeaders,
              rows: detailDataRows,
            },
          ],
        });
      } else {
        // Daily View Export
        const fileName = `Attendance_Daily_${date}`;

        const summaryRows = [
          ["Report", "Daily Attendance Log Report"],
          ["Date", formatDateDDMMYYYY(date)],
          ["Generated Date", new Date().toLocaleString("en-IN")],
          ["Total Staff", dailyStats.totalEmployees],
          ["Total Logs", dailyStats.totalRecords],
          ["Present Count", dailyStats.present],
          ["Late Count", dailyStats.late],
          ["Absent Count", dailyStats.absent],
          ["Half Day Count", dailyStats.halfDay],
          ["On Leave Count", dailyStats.onLeave],
          ["Holiday / Off Count", dailyStats.holidayOff],
        ];

        const headers = [
          "#",
          "Date",
          "Employee Name",
          "Employee ID",
          "Department",
          "Designation",
          "Punch In",
          "Punch Out",
          "Attendance Status",
          "Late Time",
          "Working Hours",
          "Overtime",
          "Location",
        ];

        const rows = filteredDailyRecords.map((r, idx) => {
          const emp = r.employeeId || {};
          const empName =
            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeName || "Employee";
          const empCode = emp.employeeCode || "—";
          const deptName = emp.departmentId?.name || emp.department || "General";
          const desigName = emp.designationId?.name || emp.designation || "—";
          const totalHrs = Number(r.totalHours) || 0;
          const otHrs = totalHrs > 8 ? (totalHrs - 8).toFixed(1) : "0.0";
          const location = r.punchInLocation?.address || r.punchInLocation || "—";
          const rawStatus = (r.status || "absent").toLowerCase();
          const lateText = rawStatus === "late" ? `${fmtTime(r.punchInTime)} (Late Arrival)` : "None";

          return [
            idx + 1,
            formatDateDDMMYYYY(r.date),
            empName,
            empCode,
            deptName,
            desigName,
            fmtTime(r.punchInTime),
            fmtTime(r.punchOutTime),
            rawStatus.toUpperCase().replace(/_/g, " "),
            lateText,
            `${totalHrs.toFixed(1)} hrs`,
            `${otHrs} hrs`,
            location,
          ];
        });

        await exportToExcel({
          fileName,
          sheetName: "Daily Attendance",
          summaryRows,
          headers,
          rows,
        });
      }
    } catch (err) {
      console.warn("[AttendanceReportScreen] Excel export error:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  // ── PDF Export Handler ───────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (downloadingPdf) return;
    try {
      setDownloadingPdf(true);

      if (viewMode === "monthly") {
        const rowsHtml = filteredMonthlyEmps
          .map(
            (emp) => `
            <tr>
              <td>${emp.name} <small>(${emp.code})</small></td>
              <td>${emp.dept}</td>
              <td style="text-align: center;">${emp.workingDays}</td>
              <td style="text-align: center; color: #059669; font-weight: bold;">${emp.present}</td>
              <td style="text-align: center; color: #DC2626;">${emp.absent}</td>
              <td style="text-align: center; color: #7C3AED;">${emp.halfDay}</td>
              <td style="text-align: center; color: #2563EB;">${emp.onLeave}</td>
              <td style="text-align: center;">${emp.weeklyOff}</td>
              <td style="text-align: center;">${emp.holiday}</td>
              <td style="text-align: center; color: #0284C7; font-weight: bold;">${emp.overtime}h</td>
              <td style="text-align: center; font-weight: bold;">${emp.attPct}%</td>
            </tr>
          `
          )
          .join("");

        const html = `
          <div style="font-family: Arial, sans-serif; padding: 10px;">
            <h2 style="color: #0F172A; margin-bottom: 4px;">Employee-Wise Monthly Attendance Summary</h2>
            <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: Month ${month} / ${year} | Total Staff: ${filteredMonthlyEmps.length}</p>

            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 10px;">
              <thead>
                <tr style="background-color: #F1F5F9; text-align: left;">
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Staff</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Dept</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Work Days</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Present</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Absent</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Half Day</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Leaves</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">W.Off</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Holiday</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Overtime</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1; text-align: center;">Rate %</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;

        await generateAndSharePDF(`Attendance Monthly - ${month}/${year}`, html);
      } else {
        // Daily PDF
        const rowsHtml = filteredDailyRecords
          .map((r) => {
            const emp = r.employeeId || {};
            const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeName || "Employee";
            const empCode = emp.employeeCode || "—";
            const dept = emp.departmentId?.name || emp.department || "General";
            const totalHrs = r.totalHours ? Number(r.totalHours).toFixed(1) : "0.0";

            return `
              <tr>
                <td>${empName} <small>(${empCode})</small></td>
                <td>${dept}</td>
                <td>${formatDateToDDMMYYYY(r.date)}</td>
                <td><strong>${(r.status || "absent").toUpperCase()}</strong></td>
                <td>${fmtTime(r.punchInTime)}</td>
                <td>${fmtTime(r.punchOutTime)}</td>
                <td>${totalHrs}h</td>
              </tr>
            `;
          })
          .join("");

        const html = `
          <div style="font-family: Arial, sans-serif; padding: 10px;">
            <h2 style="color: #0F172A; margin-bottom: 4px;">Daily Attendance Intelligence Report</h2>
            <p style="color: #64748B; font-size: 11px; margin-top: 0;">Date: ${date} | Total Records: ${filteredDailyRecords.length}</p>

            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
              <thead>
                <tr style="background-color: #F1F5F9; text-align: left;">
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Staff</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Department</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Date</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">In</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Out</th>
                  <th style="padding: 6px; border: 1px solid #CBD5E1;">Hours</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;

        await generateAndSharePDF(`Attendance Daily - ${date}`, html);
      }
    } catch (err) {
      console.warn("[AttendanceReportScreen] PDF export error:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const selectedStatusLabel =
    STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || "Status";
  const selectedDeptLabel =
    departmentFilter === "all"
      ? "All Departments"
      : departments.find((d) => String(d._id) === String(departmentFilter))?.name || "Department";

  return (
    <View style={styles.container}>
      <ReportHeader
        title="Attendance Report"
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
        onDownload={handleExportPdf}
        downloading={downloadingPdf}
        onExportExcel={handleExportExcel}
        exportingExcel={exportingExcel}
        extraFilters={
          <View style={styles.viewModeSwitcher}>
            <TouchableOpacity
              style={[styles.viewModePill, viewMode === "monthly" && styles.viewModePillActive]}
              onPress={() => setViewMode("monthly")}
            >
              <Ionicons
                name="calendar"
                size={12}
                color={viewMode === "monthly" ? "#0284C7" : "#64748B"}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.viewModePillText,
                  viewMode === "monthly" && styles.viewModePillTextActive,
                ]}
              >
                Monthly Summary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModePill, viewMode === "daily" && styles.viewModePillActive]}
              onPress={() => setViewMode("daily")}
            >
              <Ionicons
                name="today-outline"
                size={12}
                color={viewMode === "daily" ? "#0284C7" : "#64748B"}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.viewModePillText,
                  viewMode === "daily" && styles.viewModePillTextActive,
                ]}
              >
                Daily Logs
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
      >
        {/* ── 1. EXECUTIVE KPI DECK ─────────────────────────────────── */}
        {viewMode === "monthly" ? (
          <View style={styles.kpiDeck}>
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: "#0284C7" }]}>
                <Text style={styles.kpiLabel}>STAFF ROSTER</Text>
                <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{monthlyStats.totalEmployees}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
                <Text style={styles.kpiLabel}>PRESENT DAYS</Text>
                <Text style={[styles.kpiVal, { color: "#059669" }]}>{monthlyStats.present}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#EF4444" }]}>
                <Text style={styles.kpiLabel}>ABSENT DAYS</Text>
                <Text style={[styles.kpiVal, { color: "#DC2626" }]}>{monthlyStats.absent}</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
                <Text style={styles.kpiLabel}>LATE ARRIVALS</Text>
                <Text style={[styles.kpiVal, { color: "#D97706" }]}>{monthlyStats.late}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#8B5CF6" }]}>
                <Text style={styles.kpiLabel}>HALF DAYS</Text>
                <Text style={[styles.kpiVal, { color: "#7C3AED" }]}>{monthlyStats.halfDay}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#3B82F6" }]}>
                <Text style={styles.kpiLabel}>LEAVES</Text>
                <Text style={[styles.kpiVal, { color: "#2563EB" }]}>{monthlyStats.onLeave}</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: "#64748B" }]}>
                <Text style={styles.kpiLabel}>WEEKLY OFF</Text>
                <Text style={[styles.kpiVal, { color: "#475569" }]}>{monthlyStats.weeklyOff}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#6366F1" }]}>
                <Text style={styles.kpiLabel}>HOLIDAYS</Text>
                <Text style={[styles.kpiVal, { color: "#4F46E5" }]}>{monthlyStats.holiday}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#0284C7" }]}>
                <Text style={styles.kpiLabel}>TOTAL OVERTIME</Text>
                <Text style={[styles.kpiVal, { color: "#0284C7" }]}>{monthlyStats.overtime}h</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.kpiDeck}>
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: "#0284C7" }]}>
                <Text style={styles.kpiLabel}>TOTAL STAFF</Text>
                <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{dailyStats.totalEmployees}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
                <Text style={styles.kpiLabel}>PRESENT</Text>
                <Text style={[styles.kpiVal, { color: "#059669" }]}>{dailyStats.present}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#EF4444" }]}>
                <Text style={styles.kpiLabel}>ABSENT</Text>
                <Text style={[styles.kpiVal, { color: "#DC2626" }]}>{dailyStats.absent}</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
                <Text style={styles.kpiLabel}>LATE ARRIVAL</Text>
                <Text style={[styles.kpiVal, { color: "#D97706" }]}>{dailyStats.late}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#8B5CF6" }]}>
                <Text style={styles.kpiLabel}>HALF DAY</Text>
                <Text style={[styles.kpiVal, { color: "#7C3AED" }]}>{dailyStats.halfDay}</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: "#3B82F6" }]}>
                <Text style={styles.kpiLabel}>ON LEAVE</Text>
                <Text style={[styles.kpiVal, { color: "#2563EB" }]}>{dailyStats.onLeave}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── 2. FILTERS & SEARCH BAR ───────────────────────────────── */}
        <View style={styles.filterSection}>
          <View style={styles.filterDropdownRow}>
            {viewMode === "daily" && (
              <TouchableOpacity
                style={styles.filterTriggerPill}
                onPress={() => setShowStatusModal(true)}
              >
                <Ionicons name="filter-outline" size={12} color="#64748B" />
                <Text style={styles.filterTriggerText} numberOfLines={1}>
                  {selectedStatusLabel}
                </Text>
                <Ionicons name="chevron-down" size={11} color="#94A3B8" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.filterTriggerPill}
              onPress={() => setShowDeptModal(true)}
            >
              <Ionicons name="business-outline" size={12} color="#64748B" />
              <Text style={styles.filterTriggerText} numberOfLines={1}>
                {selectedDeptLabel}
              </Text>
              <Ionicons name="chevron-down" size={11} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={14} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search staff by name or employee code..."
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.resultsBadgeRow}>
            <Text style={styles.resultsCountText}>
              {viewMode === "monthly"
                ? `Showing ${filteredMonthlyEmps.length} staff summaries for ${daysInMonth} calendar days`
                : `Showing ${filteredDailyRecords.length} daily logs for ${date}`}
            </Text>
          </View>
        </View>

        {/* ── 3. MONTHLY SUMMARY LIST (PRIMARY VIEW) ────────────────── */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#0284C7" />
            <Text style={styles.loadingText}>Compiling monthly attendance summary...</Text>
          </View>
        ) : viewMode === "monthly" ? (
          filteredMonthlyEmps.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Monthly Records Found</Text>
              <Text style={styles.emptySubtitle}>
                No employee attendance records match the selected month, year, or search filters.
              </Text>
            </View>
          ) : (
            <View style={styles.empList}>
              {filteredMonthlyEmps.map((emp) => {
                const isExpanded = expandedEmpId === emp._id;
                const attColor =
                  emp.attPct >= 80 ? "#059669" : emp.attPct >= 60 ? "#D97706" : "#DC2626";
                const attBg =
                  emp.attPct >= 80 ? "#ECFDF5" : emp.attPct >= 60 ? "#FEF3C7" : "#FEF2F2";
                const attBorder =
                  emp.attPct >= 80 ? "#A7F3D0" : emp.attPct >= 60 ? "#FDE68A" : "#FECACA";

                return (
                  <View key={emp._id} style={styles.monthlyCard}>
                    {/* Employee Profile Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarPill}>
                        <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
                      </View>

                      <View style={styles.headerInfo}>
                        <Text style={styles.empNameText} numberOfLines={1}>
                          {emp.name}
                        </Text>
                        <Text style={styles.empMetaText} numberOfLines={1}>
                          {emp.code} • {emp.dept} • {emp.desig}
                        </Text>
                      </View>

                      <View style={[styles.rateBadge, { backgroundColor: attBg, borderColor: attBorder }]}>
                        <Text style={[styles.rateBadgeText, { color: attColor }]}>
                          {emp.attPct}%
                        </Text>
                      </View>
                    </View>

                    {/* Compact Attendance Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(emp.attPct, 100)}%`, backgroundColor: attColor },
                        ]}
                      />
                    </View>

                    {/* Comprehensive Monthly Summary Matrix */}
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>WORK DAYS</Text>
                        <Text style={styles.metricVal}>{emp.workingDays}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>PRESENT</Text>
                        <Text style={[styles.metricVal, { color: "#059669" }]}>{emp.present}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>ABSENT</Text>
                        <Text style={[styles.metricVal, { color: "#DC2626" }]}>{emp.absent}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>HALF DAY</Text>
                        <Text style={[styles.metricVal, { color: "#7C3AED" }]}>{emp.halfDay}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>LEAVES</Text>
                        <Text style={[styles.metricVal, { color: "#2563EB" }]}>{emp.onLeave}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>WEEKLY OFF</Text>
                        <Text style={[styles.metricVal, { color: "#475569" }]}>{emp.weeklyOff}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>HOLIDAY</Text>
                        <Text style={[styles.metricVal, { color: "#4F46E5" }]}>{emp.holiday}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>LATE DAYS</Text>
                        <Text style={[styles.metricVal, { color: "#D97706" }]}>{emp.late}</Text>
                      </View>

                      <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>OVERTIME</Text>
                        <Text style={[styles.metricVal, { color: "#0284C7" }]}>
                          {emp.overtime > 0 ? `${emp.overtime}h` : "—"}
                        </Text>
                      </View>
                    </View>

                    {/* Accordion Trigger for Punch In / Out Details */}
                    <TouchableOpacity
                      style={styles.drilldownBtn}
                      onPress={() => setExpandedEmpId(isExpanded ? null : emp._id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.drilldownBtnLeft}>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color="#0284C7"
                        />
                        <Text style={styles.drilldownBtnText}>
                          {isExpanded
                            ? "Hide Daily Punch Logs"
                            : `View Daily Punch Logs (${emp.records.length} logs)`}
                        </Text>
                      </View>
                      <Text style={styles.drilldownBtnRight}>
                        {emp.totalHours}h Total Worked
                      </Text>
                    </TouchableOpacity>

                    {/* Expanded Day-By-Day Punch Log Timeline */}
                    {isExpanded && (
                      <View style={styles.drilldownTimeline}>
                        {emp.records.length === 0 ? (
                          <Text style={styles.emptyDrilldownText}>
                            No daily punch records logged for this employee.
                          </Text>
                        ) : (
                          emp.records.map((dr, rIdx) => {
                            const rawSt = (dr.status || "absent").toLowerCase();
                            const stCfg =
                              STATUS_COLORS[rawSt] ||
                              STATUS_COLORS[rawSt.replace(/_/g, "-")] ||
                              STATUS_COLORS.absent;
                            const otHrs =
                              dr.totalHours && dr.totalHours > 8
                                ? (dr.totalHours - 8).toFixed(1)
                                : null;

                            return (
                              <View key={dr._id || rIdx} style={styles.timelineRow}>
                                <View style={styles.timelineDateBlock}>
                                  <Text style={styles.timelineDateText}>
                                    {formatDateToDDMMYYYY(dr.date)}
                                  </Text>
                                  <View
                                    style={[
                                      styles.statusTagMini,
                                      { backgroundColor: stCfg.bg, borderColor: stCfg.border },
                                    ]}
                                  >
                                    <View
                                      style={[styles.statusDotMini, { backgroundColor: stCfg.dot }]}
                                    />
                                    <Text style={[styles.statusTextMini, { color: stCfg.text }]}>
                                      {(dr.status || "absent").toUpperCase()}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.timelinePunches}>
                                  <Text style={styles.punchText}>
                                    In: <Text style={styles.punchBold}>{fmtTime(dr.punchInTime)}</Text>
                                  </Text>
                                  <Text style={styles.punchText}>
                                    Out: <Text style={styles.punchBold}>{fmtTime(dr.punchOutTime)}</Text>
                                  </Text>
                                  <Text style={styles.punchText}>
                                    Hrs:{" "}
                                    <Text style={[styles.punchBold, { color: "#0284C7" }]}>
                                      {dr.totalHours ? Number(dr.totalHours).toFixed(1) : "0.0"}h
                                    </Text>
                                  </Text>
                                  {otHrs && (
                                    <View style={styles.otBadgeMini}>
                                      <Text style={styles.otBadgeMiniText}>+{otHrs}h OT</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* ── 4. DAILY VIEW (INDIVIDUAL PUNCH LOGS) ─────────────────── */
          filteredDailyRecords.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
              <Text style={styles.emptySubtitle}>
                No daily punch records found for {date} matching the selected filters.
              </Text>
            </View>
          ) : (
            <View style={styles.empList}>
              {filteredDailyRecords.map((r, idx) => {
                const emp = r.employeeId || {};
                const empName =
                  `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeName || "Employee";
                const empCode = emp.employeeCode || "—";
                const deptName = emp.departmentId?.name || emp.department || "General";
                const rawStatus = (r.status || "absent").toLowerCase();
                const cfg =
                  STATUS_COLORS[rawStatus] ||
                  STATUS_COLORS[rawStatus.replace(/_/g, "-")] ||
                  STATUS_COLORS.absent;
                const totalHrs = r.totalHours ? Number(r.totalHours).toFixed(1) : "0.0";
                const otHrs = r.totalHours && r.totalHours > 8 ? (r.totalHours - 8).toFixed(1) : null;

                return (
                  <View key={r._id || idx} style={styles.dailyCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.avatarPill}>
                        <Text style={styles.avatarText}>{empName.charAt(0).toUpperCase()}</Text>
                      </View>

                      <View style={styles.headerInfo}>
                        <Text style={styles.empNameText} numberOfLines={1}>
                          {empName}
                        </Text>
                        <Text style={styles.empMetaText}>
                          {empCode} • {deptName}
                        </Text>
                      </View>

                      <View style={[styles.statusTag, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                        <Text style={[styles.statusText, { color: cfg.text }]}>
                          {(r.status || "absent").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordDivider} />

                    <View style={styles.dailyDetailsRow}>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>DATE</Text>
                        <Text style={styles.detailVal}>{formatDateToDDMMYYYY(r.date)}</Text>
                      </View>

                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>PUNCH IN</Text>
                        <Text style={styles.detailVal}>{fmtTime(r.punchInTime)}</Text>
                      </View>

                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>PUNCH OUT</Text>
                        <Text style={styles.detailVal}>{fmtTime(r.punchOutTime)}</Text>
                      </View>

                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>HOURS</Text>
                        <Text style={[styles.detailVal, { color: "#0F172A", fontWeight: "bold" }]}>
                          {totalHrs}h
                        </Text>
                        {otHrs && <Text style={styles.dailyOtText}>+{otHrs}h OT</Text>}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* ── MODAL: STATUS FILTER ───────────────────────────────────── */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.modalHeadTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = statusFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.modalItem, isSelected && styles.modalItemActive]}
                  onPress={() => {
                    setStatusFilter(opt.value);
                    setShowStatusModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#0284C7" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL: DEPARTMENT FILTER ───────────────────────────────── */}
      <Modal visible={showDeptModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDeptModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.modalHeadTitle}>Filter by Department</Text>
              <TouchableOpacity onPress={() => setShowDeptModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.modalItem, departmentFilter === "all" && styles.modalItemActive]}
                onPress={() => {
                  setDepartmentFilter("all");
                  setShowDeptModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    departmentFilter === "all" && styles.modalItemTextActive,
                  ]}
                >
                  All Departments
                </Text>
                {departmentFilter === "all" && <Ionicons name="checkmark" size={16} color="#0284C7" />}
              </TouchableOpacity>
              {departments.map((dept) => {
                const isSelected = String(dept._id) === String(departmentFilter);
                return (
                  <TouchableOpacity
                    key={dept._id}
                    style={[styles.modalItem, isSelected && styles.modalItemActive]}
                    onPress={() => {
                      setDepartmentFilter(dept._id);
                      setShowDeptModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                      {dept.name || dept.departmentName}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#0284C7" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  viewModeSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    marginTop: 6,
  },
  viewModePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewModePillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewModePillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  viewModePillTextActive: {
    color: "#0284C7",
    fontFamily: FONTS.bodyBold,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  kpiDeck: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    gap: 6,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  kpiVal: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 1,
    includeFontPadding: false,
  },
  filterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
    gap: 8,
  },
  filterDropdownRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterTriggerPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterTriggerText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#334155",
    flex: 1,
    marginHorizontal: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    height: 34,
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.body,
    color: "#0F172A",
    marginLeft: 6,
    paddingVertical: 0,
  },
  resultsBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsCountText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  empList: {
    gap: 8,
  },
  monthlyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  empNameText: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    includeFontPadding: false,
  },
  empMetaText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
    marginTop: 1,
    includeFontPadding: false,
  },
  rateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  rateBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    includeFontPadding: false,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 4,
  },
  metricCell: {
    width: "31.8%",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  metricLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    letterSpacing: 0.25,
    includeFontPadding: false,
  },
  metricVal: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 1,
    includeFontPadding: false,
  },
  drilldownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  drilldownBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  drilldownBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#0284C7",
    includeFontPadding: false,
  },
  drilldownBtnRight: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#334155",
    includeFontPadding: false,
  },
  drilldownTimeline: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 6,
  },
  emptyDrilldownText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timelineDateBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timelineDateText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    includeFontPadding: false,
  },
  statusTagMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusDotMini: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
  },
  statusTextMini: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    includeFontPadding: false,
  },
  timelinePunches: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  punchText: {
    fontSize: 10.5,
    color: "#334155",
    fontFamily: FONTS.bodyMedium,
    includeFontPadding: false,
  },
  punchBold: {
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    fontSize: 11,
    includeFontPadding: false,
  },
  otBadgeMini: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  otBadgeMiniText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#0284C7",
    includeFontPadding: false,
  },
  dailyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  recordDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 7,
  },
  dailyDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  detailVal: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
    marginTop: 1,
    includeFontPadding: false,
  },
  dailyOtText: {
    fontSize: 9.5,
    color: "#0284C7",
    fontFamily: FONTS.bodyBold,
    includeFontPadding: false,
  },
  loadingBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 6,
    fontFamily: FONTS.body,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 6,
  },
  modalHeadTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  modalItemActive: {
    backgroundColor: "#F0F9FF",
  },
  modalItemText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#334155",
  },
  modalItemTextActive: {
    color: "#0284C7",
    fontFamily: FONTS.bodyBold,
  },
});

export default AttendanceReportScreen;
