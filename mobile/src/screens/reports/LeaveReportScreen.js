import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getLeaveSummaryApi, getBILeaveReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const STATUS_CFG = {
  approved: { bg: "#ECFDF5", text: "#059669", dot: "#10B981", border: "#A7F3D0" },
  pending: { bg: "#FEF3C7", text: "#D97706", dot: "#F59E0B", border: "#FDE68A" },
  rejected: { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", border: "#FECACA" },
};

const LeaveReportScreen = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [downloading, setDownloading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadSummary = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      
      const res = await getBILeaveReportApi({ month, year, refresh }).catch(() => null);
      if (res?.data?.data) {
        const bi = res.data.data;
        setSummary({
          totalLeaves: bi.kpis?.total || 0,
          approved: bi.kpis?.approved || 0,
          pending: bi.kpis?.pending || 0,
          rejected: bi.kpis?.rejected || 0,
          list: bi.records || [],
          typeDistribution: bi.typeDistribution || [],
          departmentBreakdown: bi.departmentBreakdown || [],
          employeeBreakdown: bi.employeeBreakdown || [],
        });
      } else {
        const { data } = await getLeaveSummaryApi({ month, year });
        setSummary(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leave summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [month, year])
  );

  const filteredLeaves = useMemo(() => {
    const list = summary?.list || [];
    return list.filter((l) => {
      const emp = l.employeeId || {};
      const empName = l.employeeName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
      const s = search.toLowerCase();
      const matchSearch = !s || empName.toLowerCase().includes(s) || (l.leaveType || "").toLowerCase().includes(s);
      const matchStatus = statusFilter === "all" || (l.status || "").toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [summary, search, statusFilter]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `Leave_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Company Leave Report"],
        ["Period", `${month ? `Month ${month}` : "All Months"}, ${year || "All Years"}`],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Total Leaves", summary?.totalLeaves || 0],
        ["Approved", summary?.approved || 0],
        ["Pending", summary?.pending || 0],
        ["Rejected", summary?.rejected || 0],
      ];
      const headers = ["#", "Staff Name", "Leave Type", "Duration (Days)", "From Date", "To Date", "Status", "Reason"];
      const rows = filteredLeaves.map((l, idx) => {
        const emp = l.employeeId || {};
        const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
        return [
          idx + 1,
          empName,
          l.leaveType || "General",
          l.numberOfDays || 1,
          l.startDate ? formatDateToDDMMYYYY(l.startDate) : "—",
          l.endDate ? formatDateToDDMMYYYY(l.endDate) : "—",
          (l.status || "pending").toUpperCase(),
          l.reason || "—",
        ];
      });

      await exportToExcel({
        fileName,
        sheetName: "Leave Report",
        summaryRows,
        headers,
        rows,
      });
    } catch (err) {
      console.warn("Excel export error:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  // PDF Export
  const handleDownload = async () => {
    if (!summary || !summary.list || downloading) return;
    try {
      setDownloading(true);
      const rows = filteredLeaves
        .map((l) => {
          const emp = l.employeeId || {};
          const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
          return `
            <tr>
              <td>${empName}</td>
              <td>${l.leaveType || "General"}</td>
              <td>${l.numberOfDays || 1}</td>
              <td>${(l.status || "pending").toUpperCase()}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">Leave Summary Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px; border-radius: 6px; flex: 1;">Total: <b>${summary.totalLeaves}</b></div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px; border-radius: 6px; flex: 1; color: #059669;">Approved: <b>${summary.approved}</b></div>
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; padding: 8px; border-radius: 6px; flex: 1; color: #D97706;">Pending: <b>${summary.pending}</b></div>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 8px; border-radius: 6px; flex: 1; color: #DC2626;">Rejected: <b>${summary.rejected}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Staff</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Type</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Days</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`Leave Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
    } catch (err) {
      console.warn("PDF export error:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !summary) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <ReportHeader
          title="Leave Report"
          month={month}
          year={year}
          setMonth={setMonth}
          setYear={setYear}
          onDownload={() => {}}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReportHeader
        title="Leave Report"
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
        onDownload={handleDownload}
        downloading={downloading}
        onExportExcel={handleExportExcel}
        exportingExcel={exportingExcel}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSummary(true)} />}
      >
        {/* Executive Compact KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.kpiLabel}>TOTAL REQUESTS</Text>
            <Text style={[styles.kpiVal, { color: "#1E293B" }]}>{summary?.totalLeaves || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>APPROVED</Text>
            <Text style={[styles.kpiVal, { color: "#059669" }]}>{summary?.approved || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>PENDING</Text>
            <Text style={[styles.kpiVal, { color: "#D97706" }]}>{summary?.pending || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#EF4444" }]}>
            <Text style={styles.kpiLabel}>REJECTED</Text>
            <Text style={[styles.kpiVal, { color: "#DC2626" }]}>{summary?.rejected || 0}</Text>
          </View>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterCard}>
          <View style={styles.statusPillsRow}>
            {["all", "approved", "pending", "rejected"].map((st) => {
              const isSel = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusPill, isSel && styles.statusPillActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text style={[styles.statusPillText, isSel && styles.statusPillTextActive]}>
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={13} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by team member or leave type..."
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Leave Records List */}
        {filteredLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Leave Logs Found</Text>
            <Text style={styles.emptySub}>No leave applications match the selected period or filters.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredLeaves.map((leave, idx) => {
              const emp = leave.employeeId || {};
              const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
              const st = (leave.status || "pending").toLowerCase();
              const cfg = STATUS_CFG[st] || STATUS_CFG.pending;

              return (
                <View key={leave._id || idx} style={styles.leaveCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarText}>{empName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.empNameText} numberOfLines={1}>{empName}</Text>
                      <Text style={styles.empSubText}>{leave.leaveType || "General Leave"}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                      <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                      <Text style={[styles.statusTagText, { color: cfg.text }]}>
                        {st.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>DURATION</Text>
                      <Text style={styles.metaVal}>{leave.numberOfDays || 1} Days</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>START DATE</Text>
                      <Text style={styles.metaVal}>{leave.startDate ? formatDateToDDMMYYYY(leave.startDate) : "—"}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>END DATE</Text>
                      <Text style={styles.metaVal}>{leave.endDate ? formatDateToDDMMYYYY(leave.endDate) : "—"}</Text>
                    </View>
                  </View>

                  {leave.reason ? (
                    <Text style={styles.reasonText} numberOfLines={2}>
                      Note: {leave.reason}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 10,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 3,
  },
  kpiLabel: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
  },
  kpiVal: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: "800",
    marginTop: 2,
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
    gap: 6,
  },
  statusPillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 5,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  statusPillText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 7,
    paddingHorizontal: 8,
    height: 32,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.body,
    color: "#0F172A",
  },
  listContainer: {
    gap: 6,
  },
  leaveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#2563EB",
  },
  empNameText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  empSubText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
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
  statusTagText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: "#94A3B8",
  },
  metaVal: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#1E293B",
    marginTop: 1,
  },
  reasonText: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: FONTS.body,
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 3,
  },
});

export default LeaveReportScreen;
