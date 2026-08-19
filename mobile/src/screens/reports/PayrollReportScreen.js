import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getPayrollSummaryApi } from "../../api/reportService";
import { generateAndSharePDF } from "../../utils/pdfGenerator";

import { FONTS } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const PayrollReportScreen = () => {
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
      const { data } = await getPayrollSummaryApi({ month, year });
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payroll summary");
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

    const rows = summary.list.map(p => {
      const empName = p.employeeId ? `${p.employeeId.firstName} ${p.employeeId.lastName}` : "Unknown";
      const attRate = p.attendanceRate !== undefined ? `${p.attendanceRate.toFixed(1)}%` : "100.0%";
      const perfScore = p.performanceScore !== undefined ? `${p.performanceScore.toFixed(1)}%` : "100.0%";
      return `
        <tr>
          <td>${empName}</td>
          <td>${p.month} ${p.year}</td>
          <td>${attRate}</td>
          <td>${perfScore}</td>
          <td>₹${p.netSalary.toLocaleString("en-IN")}</td>
          <td>${p.status.toUpperCase()}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <div class="summary">
        <div class="stat-box">Total Payroll<div class="stat-value">₹${summary.totalPayroll.toLocaleString("en-IN")}</div></div>
        <div class="stat-box">Paid<div class="stat-value" style="color: #16a34a">₹${summary.paid.toLocaleString("en-IN")}</div></div>
        <div class="stat-box">Due<div class="stat-value" style="color: #f59e0b">₹${summary.due.toLocaleString("en-IN")}</div></div>
      </div>
      <h2>Payroll Details (Based on Attendance & Performance)</h2>
      <table>
        <thead>
          <tr>
            <th>Team Member</th>
            <th>Period</th>
            <th>Attendance Rate</th>
            <th>Performance Score</th>
            <th>Net Salary</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    await generateAndSharePDF(`Payroll Report - ${month ? month + '/' : ''}${year || 'All Time'}`, html);
    setDownloading(false);
  };

  if (loading && !summary) {
    return (
      <View style={{ flex: 1 }}>
        <ReportHeader title="Payroll Report" month={month} year={year} setMonth={setMonth} setYear={setYear} onDownload={() => {}} />
        <Loader />
      </View>
    );
  }

  const chartData = [
    { name: "Paid", population: summary?.paid || 0, color: "#10b981", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Due", population: summary?.due || 0, color: "#f59e0b", legendFontColor: "#475569", legendFontSize: 12 },
  ].filter(d => d.population > 0);

  return (
    <View style={styles.container}>
      <ReportHeader 
        title="Payroll Report" 
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
            <Text style={styles.statLabel}>TOTAL PAYROLL</Text>
            <Text style={[styles.statValue, { color: "#2563eb" }]}>₹{summary?.totalPayroll?.toLocaleString("en-IN") || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#10b981" }]}>
            <Text style={styles.statLabel}>PAID</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>₹{summary?.paid?.toLocaleString("en-IN") || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#f59e0b" }]}>
            <Text style={styles.statLabel}>DUE / PENDING</Text>
            <Text style={[styles.statValue, { color: "#f59e0b" }]}>₹{summary?.due?.toLocaleString("en-IN") || 0}</Text>
          </View>
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Payment Breakdown</Text>
            <PieChart
              data={chartData}
              width={width - 64}
              height={180}
              chartConfig={{ color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </View>
        )}

        {/* List */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Detailed Payroll Log</Text>
        <View style={styles.listContainer}>
          {summary?.list && summary.list.length > 0 ? (
            summary.list.map((p, idx) => {
              const empName = p.employeeId ? `${p.employeeId.firstName} ${p.employeeId.lastName}` : "Unknown";
              const initials = empName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              
              // Define pill colors
              let badgeBg = "rgba(245, 158, 11, 0.1)"; // Amber 10% (due)
              let badgeText = "#f59e0b";
              if (p.status === 'paid') {
                badgeBg = "rgba(16, 185, 129, 0.1)"; // Emerald 10%
                badgeText = "#10b981";
              }

              return (
                <View key={p._id} style={[styles.listItem, idx !== summary.list.length - 1 && styles.listItemBorder]}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={styles.itemTitle}>{empName}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.itemSub}>{p.month} {p.year}</Text>
                      <Text style={styles.divider}>•</Text>
                      <Ionicons name="trending-up" size={11} color="#10b981" style={{ marginRight: 4 }} />
                      <Text style={styles.itemSub}>Perf: {p.performanceScore !== undefined ? `${p.performanceScore.toFixed(0)}%` : "100%"}</Text>
                    </View>
                  </View>
                  <View style={styles.statusCol}>
                    <Text style={styles.amountText}>₹{p.netSalary?.toLocaleString("en-IN")}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusBadgeText, { color: badgeText }]}>
                        {p.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No payroll records found for this period.</Text>
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
  statValue: { fontSize: 24, fontFamily: FONTS.displayBold },
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: "#1e293b", marginBottom: 12, alignSelf: "flex-start" },
  listContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  listItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#64748b",
  },
  listItemContent: { flex: 1, paddingRight: 12 },
  itemTitle: { fontSize: 14, fontFamily: FONTS.displayBold, color: "#1e293b", marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  itemSub: { fontSize: 11, color: "#64748b", fontFamily: FONTS.bodyMedium },
  divider: { fontSize: 11, color: "#cbd5e1", marginHorizontal: 6 },
  statusCol: { alignItems: "flex-end", justifyContent: "center" },
  amountText: { fontSize: 14, fontFamily: FONTS.displayBold, color: "#1e293b", marginBottom: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: { fontSize: 9, fontFamily: FONTS.bodyBold, letterSpacing: 0.3 },
  emptyText: { textAlign: "center", color: "#94a3b8", paddingVertical: 20, fontFamily: FONTS.bodyMedium },
});

export default PayrollReportScreen;
