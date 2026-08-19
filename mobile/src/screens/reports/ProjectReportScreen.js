import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getProjectSummaryApi } from "../../api/reportService";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const ProjectReportScreen = () => {
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
      const { data } = await getProjectSummaryApi({ month, year });
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project summary");
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
        <td>${p.name}</td>
        <td>${p.projectManager?.firstName || 'None'} ${p.projectManager?.lastName || ''}</td>
        <td>${p.status.toUpperCase()}</td>
        <td>${p.priority.toUpperCase()}</td>
      </tr>
    `).join("");

    const html = `
      <div class="summary">
        <div class="stat-box">Total Projects<div class="stat-value">${summary.totalProjects}</div></div>
        <div class="stat-box">Active<div class="stat-value" style="color: #2563eb">${summary.activeProjects}</div></div>
        <div class="stat-box">Completed<div class="stat-value" style="color: #16a34a">${summary.completedProjects}</div></div>
      </div>
      <h2>Project List</h2>
      <table>
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Manager</th>
            <th>Status</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    await generateAndSharePDF(`Project Report - ${month ? month + '/' : ''}${year || 'All Time'}`, html);
    setDownloading(false);
  };

  if (loading && !summary) {
    return (
      <View style={{ flex: 1 }}>
        <ReportHeader title="Project Report" month={month} year={year} setMonth={setMonth} setYear={setYear} onDownload={() => {}} />
        <Loader />
      </View>
    );
  }

  const chartData = [
    { name: "Active", population: summary?.activeProjects || 0, color: "#3b82f6", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Completed", population: summary?.completedProjects || 0, color: "#10b981", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Other", population: summary?.otherProjects || 0, color: "#94a3b8", legendFontColor: "#475569", legendFontSize: 12 },
  ].filter(d => d.population > 0);

  return (
    <View style={styles.container}>
      <ReportHeader 
        title="Project Report" 
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
          <View style={[styles.statBox, { borderTopColor: "#C2410C", width: "100%" }]}>
            <Text style={styles.statLabel}>TOTAL PROJECTS</Text>
            <Text style={[styles.statValue, { color: "#C2410C" }]}>{summary?.totalProjects || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#3b82f6" }]}>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={[styles.statValue, { color: "#3b82f6" }]}>{summary?.activeProjects || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#10b981" }]}>
            <Text style={styles.statLabel}>COMPLETED</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>{summary?.completedProjects || 0}</Text>
          </View>
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Status Breakdown</Text>
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
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Detailed Project List</Text>
        <View style={styles.listContainer}>
          {summary?.list && summary.list.length > 0 ? (
            summary.list.map((p, idx) => {
              // Define status pill colors
              let statusBg = "rgba(148, 163, 184, 0.1)"; // Slate 10%
              let statusText = "#94a3b8";
              if (p.status === 'completed') {
                statusBg = "rgba(16, 185, 129, 0.1)"; // Emerald 10%
                statusText = "#10b981";
              } else if (p.status === 'active' || p.status === 'in-progress') {
                statusBg = "rgba(59, 130, 246, 0.1)"; // Blue 10%
                statusText = "#3b82f6";
              }

              const mgrName = p.projectManager ? `${p.projectManager.firstName || ''} ${p.projectManager.lastName || ''}`.trim() : 'None';

              return (
                <View key={p._id} style={[styles.listItem, idx !== summary.list.length - 1 && styles.listItemBorder]}>
                  <View style={styles.projectIconContainer}>
                    <Ionicons name="folder-open-outline" size={20} color="#64748b" />
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={styles.itemTitle}>{p.name}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="person-outline" size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.itemSub}>Mgr: {mgrName}</Text>
                    </View>
                  </View>
                  <View style={styles.statusCol}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusText }]}>
                        {p.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No projects found for this period.</Text>
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
  projectIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listItemContent: { flex: 1, paddingRight: 12 },
  itemTitle: { fontSize: 14, fontFamily: FONTS.displayBold, color: "#1e293b", marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  itemSub: { fontSize: 11, color: "#64748b", fontFamily: FONTS.bodyMedium },
  statusCol: { alignItems: "flex-end", justifyContent: "center" },
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

export default ProjectReportScreen;
