import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getPerformanceReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { FONTS } from "../../theme/tokens";

const PerformanceReportScreen = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadSummary = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const { data } = await getPerformanceReportApi({ month, year });
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load performance report");
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

  const filteredList = useMemo(() => {
    const list = summary?.list || [];
    return list.filter((p) => {
      const empName = `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.toLowerCase();
      const s = search.toLowerCase();
      return !s || empName.includes(s);
    });
  }, [summary, search]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `Performance_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Employee Performance Report"],
        ["Period", `${month ? `Month ${month}` : "All Months"}, ${year || "All Years"}`],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Company Average Score", `${(summary?.averageScore || 0).toFixed(1)}%`],
        ["Total Analyzed", summary?.list?.length || 0],
      ];
      const headers = ["#", "Staff Name", "Overall Score", "Task Completion Rate", "Attendance Rate"];
      const rows = filteredList.map((p, idx) => [
        idx + 1,
        `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.trim(),
        `${(p.performanceScore || 0).toFixed(1)}%`,
        `${(p.taskCompletionRate || 0).toFixed(1)}%`,
        `${(p.attendanceRate || 0).toFixed(1)}%`,
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Performance",
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
      const rows = filteredList
        .map(
          (p) => `
          <tr>
            <td>${p.employee.firstName} ${p.employee.lastName}</td>
            <td>${p.performanceScore.toFixed(1)}%</td>
            <td>${p.taskCompletionRate.toFixed(1)}%</td>
            <td>${p.attendanceRate.toFixed(1)}%</td>
          </tr>
        `
        )
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">Performance Intelligence Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px; border-radius: 6px; flex: 1;">Team Average: <b>${(summary.averageScore || 0).toFixed(1)}%</b></div>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px; border-radius: 6px; flex: 1; color: #2563EB;">Staff Count: <b>${summary.list.length}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Staff Name</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Overall Score</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Task Rate</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Attendance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`Performance Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
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
          title="Performance Report"
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
        title="Performance Report"
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
        {/* Compact KPI Deck */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: "#EA580C" }]}>
            <Text style={styles.kpiLabel}>TEAM AVERAGE</Text>
            <Text style={[styles.kpiVal, { color: "#C2410C" }]}>
              {(summary?.averageScore || 0).toFixed(1)}%
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#0284C7" }]}>
            <Text style={styles.kpiLabel}>TOTAL ANALYZED</Text>
            <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{summary?.list?.length || 0}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchCard}>
          <Ionicons name="search" size={13} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff by name..."
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {filteredList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trending-up-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Performance Logs</Text>
            <Text style={styles.emptySub}>No performance metrics found for this period.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredList.map((p, idx) => {
              const emp = p.employee || {};
              const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
              const score = (p.performanceScore || 0).toFixed(1);

              return (
                <View key={p._id || idx} style={styles.perfCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarText}>{empName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.empNameText} numberOfLines={1}>{empName}</Text>
                      <Text style={styles.empSubText}>Performance Index</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreText}>{score}%</Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>TASK COMPLETION</Text>
                      <Text style={styles.metaVal}>{(p.taskCompletionRate || 0).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>ATTENDANCE RATE</Text>
                      <Text style={styles.metaVal}>{(p.attendanceRate || 0).toFixed(1)}%</Text>
                    </View>
                  </View>
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
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    gap: 6,
    marginBottom: 8,
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
  perfCard: {
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
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#EA580C",
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
  scoreBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  scoreText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#C2410C",
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
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#1E293B",
    marginTop: 1,
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

export default PerformanceReportScreen;
