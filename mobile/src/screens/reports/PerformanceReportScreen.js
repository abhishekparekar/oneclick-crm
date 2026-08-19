import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-chart-kit";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getPerformanceReportApi } from "../../api/reportService";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const PerformanceReportScreen = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (!summary || !summary.list) return;
    setDownloading(true);

    const rows = summary.list.map(p => `
      <tr>
        <td>${p.employee.firstName} ${p.employee.lastName}</td>
        <td>${p.performanceScore.toFixed(1)}%</td>
        <td>${p.taskCompletionRate.toFixed(1)}%</td>
        <td>${p.attendanceRate.toFixed(1)}%</td>
      </tr>
    `).join("");

    const html = `
      <div class="summary">
        <div class="stat-box">Company Average<div class="stat-value" style="color: #C2410C">${summary.averageScore.toFixed(1)}%</div></div>
        <div class="stat-box">Total Analyzed<div class="stat-value">${summary.list.length}</div></div>
      </div>
      <h2>Employee Performance Details</h2>
      <table>
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Overall Score</th>
            <th>Task Completion</th>
            <th>Attendance Rate</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    await generateAndSharePDF(`Performance Report - ${month ? month + '/' : ''}${year || 'All Time'}`, html);
    setDownloading(false);
  };

  if (loading && !summary) {
    return (
      <View style={{ flex: 1 }}>
        <ReportHeader title="Performance Report" month={month} year={year} setMonth={setMonth} setYear={setYear} onDownload={() => {}} />
        <Loader />
      </View>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 90) return "#10b981"; // Emerald green
    if (score >= 70) return "#f59e0b"; // Amber yellow
    return "#ef4444"; // Red
  };

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
    style: {
      borderRadius: 16
    },
    barPercentage: 0.5,
  };

  const topPerformers = summary?.list ? summary.list.slice(0, 5) : [];
  const barChartData = {
    labels: topPerformers.map(p => p.employee.firstName.substring(0, 7)),
    datasets: [
      {
        data: topPerformers.map(p => Math.round(p.performanceScore))
      }
    ]
  };

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
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSummary(true)} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderTopColor: "#2563eb", width: "100%" }]}>
            <Text style={styles.statLabel}>COMPANY AVERAGE SCORE</Text>
            <Text style={[styles.statValue, { color: "#2563eb" }]}>{summary?.averageScore ? summary.averageScore.toFixed(1) : 0}%</Text>
          </View>
        </View>

        {/* Top Performers Chart */}
        {topPerformers.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Top 5 Performers</Text>
            <BarChart
              data={barChartData}
              width={width - 32}
              height={180}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={chartConfig}
              style={styles.chartStyle}
              fromZero
            />
          </View>
        )}

        {/* List */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 12 }]}>Employee Performance Ranking</Text>
        <View style={styles.listContainer}>
          {summary?.list && summary.list.length > 0 ? (
            summary.list.map((p, idx) => {
              const color = getScoreColor(p.performanceScore);
              return (
                <View key={p.employee._id} style={[styles.listItem, idx !== summary.list.length - 1 && styles.listItemBorder]}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={styles.itemTitle}>{p.employee.firstName} {p.employee.lastName}</Text>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Tasks</Text>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, p.taskCompletionRate)}%`, backgroundColor: '#3b82f6' }]} />
                      </View>
                      <Text style={styles.progressValue}>{p.taskCompletionRate.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>Attendance</Text>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(100, p.attendanceRate)}%`, backgroundColor: '#10b981' }]} />
                      </View>
                      <Text style={styles.progressValue}>{p.attendanceRate.toFixed(0)}%</Text>
                    </View>
                  </View>
                  <View style={styles.statusCol}>
                    <Text style={[styles.scoreText, { color }]}>
                      {p.performanceScore.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No performance data found.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { paddingBottom: 40 },
  error: { color: "#dc2626", margin: 16, textAlign: "center", fontFamily: FONTS.bodySemiBold },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    justifyContent: "space-between",
  },
  statBox: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderTopWidth: 4,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, color: "#64748b", fontFamily: FONTS.bodyBold, marginBottom: 8, letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontFamily: FONTS.displayBold },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: "#1e293b", marginBottom: 12, alignSelf: "flex-start" },
  
  chartContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#1e293b",
    marginBottom: 12
  },
  chartStyle: {
    borderRadius: 12,
    paddingRight: 16
  },
  
  listContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)"
  },
  listItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginRight: 12 },
  rankText: { fontSize: 13, fontFamily: FONTS.displayBold, color: "#64748b" },
  listItemContent: { flex: 1, paddingRight: 12 },
  itemTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: "#1e293b", marginBottom: 8 },
  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  progressLabel: { fontSize: 10, fontFamily: FONTS.bodyBold, color: "#64748b", width: 65 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, marginHorizontal: 8, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  progressValue: { fontSize: 10, fontFamily: FONTS.bodyBold, color: "#475569", width: 28, textAlign: "right" },
  statusCol: { alignItems: "flex-end", justifyContent: "center", minWidth: 50 },
  scoreText: { fontSize: 20, fontFamily: FONTS.displayBold },
  emptyText: { textAlign: "center", color: "#94a3b8", paddingVertical: 20, fontFamily: FONTS.bodyMedium },
});

export default PerformanceReportScreen;
