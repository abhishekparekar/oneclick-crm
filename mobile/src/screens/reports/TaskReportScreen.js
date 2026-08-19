import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getTaskSummaryApi } from "../../api/reportService";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const TaskReportScreen = () => {
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
      const { data } = await getTaskSummaryApi({ month, year });
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load task summary");
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

    const rows = summary.list.map(t => `
      <tr>
        <td>${t.title}</td>
        <td>${t.status.toUpperCase()}</td>
        <td>${t.priority.toUpperCase()}</td>
        <td>${t.endDateTime ? formatDateToDDMMYYYY(t.endDateTime) : 'N/A'}</td>
      </tr>
    `).join("");

    const html = `
      <div class="summary">
        <div class="stat-box">Total Tasks<div class="stat-value">${summary.totalTasks}</div></div>
        <div class="stat-box">On Time<div class="stat-value" style="color: #16a34a">${summary.onTimeTasks || summary.onTime || 0}</div></div>
        <div class="stat-box">Delayed<div class="stat-value" style="color: #f97316">${summary.delayedTasks || summary.delayed || 0}</div></div>
        <div class="stat-box">Pending<div class="stat-value" style="color: #f59e0b">${summary.pendingTasks}</div></div>
        <div class="stat-box">Overdue<div class="stat-value" style="color: #dc2626">${summary.overdueTasks}</div></div>
      </div>
      <h2>Task Details</h2>
      <table>
        <thead>
          <tr>
            <th>Task Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    await generateAndSharePDF(`Task Report - ${month ? month + '/' : ''}${year || 'All Time'}`, html);
    setDownloading(false);
  };

  if (loading && !summary) {
    return (
      <View style={{ flex: 1 }}>
        <ReportHeader title="Task Report" month={month} year={year} setMonth={setMonth} setYear={setYear} onDownload={() => {}} />
        <Loader />
      </View>
    );
  }

  const chartData = [
    { name: "On Time", population: summary?.onTimeTasks || summary?.onTime || 0, color: "#10b981", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Delayed", population: summary?.delayedTasks || summary?.delayed || 0, color: "#ea580c", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Pending", population: summary?.pendingTasks || 0, color: "#f59e0b", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Overdue", population: summary?.overdueTasks || 0, color: "#ef4444", legendFontColor: "#475569", legendFontSize: 12 },
  ].filter(d => d.population > 0);

  return (
    <View style={styles.container}>
      <ReportHeader 
        title="Task Report" 
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
          <View style={[styles.statBox, { borderTopColor: "#3b82f6" }]}>
            <Text style={styles.statLabel}>TOTAL</Text>
            <Text style={[styles.statValue, { color: "#3b82f6" }]}>{summary?.totalTasks || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#10b981" }]}>
            <Text style={styles.statLabel}>ON TIME</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>{summary?.onTimeTasks || summary?.onTime || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#ea580c" }]}>
            <Text style={styles.statLabel}>DELAYED</Text>
            <Text style={[styles.statValue, { color: "#ea580c" }]}>{summary?.delayedTasks || summary?.delayed || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#f59e0b" }]}>
            <Text style={styles.statLabel}>PENDING</Text>
            <Text style={[styles.statValue, { color: "#f59e0b" }]}>{summary?.pendingTasks || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#ef4444", width: "100%" }]}>
            <Text style={styles.statLabel}>OVERDUE</Text>
            <Text style={[styles.statValue, { color: "#ef4444" }]}>{summary?.overdueTasks || 0}</Text>
          </View>
        </View>

        {/* Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Task Breakdown</Text>
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
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Detailed Tasks List</Text>
        <View style={styles.listContainer}>
          {summary?.list && summary.list.length > 0 ? (
            summary.list.map((task, idx) => {
              // Define priority badge styles
              let prioBg = "rgba(16, 185, 129, 0.1)"; // Low (Green)
              let prioText = "#10b981";
              if (task.priority?.toLowerCase() === 'high') {
                prioBg = "rgba(239, 68, 68, 0.1)"; // High (Red)
                prioText = "#ef4444";
              } else if (task.priority?.toLowerCase() === 'medium') {
                prioBg = "rgba(245, 158, 11, 0.1)"; // Medium (Amber)
                prioText = "#f59e0b";
              }

              // Define status pill colors
              let statusBg = "rgba(245, 158, 11, 0.1)"; // Pending (Amber)
              let statusText = "#f59e0b";
              if (task.status?.toLowerCase() === 'completed' || task.status?.toLowerCase() === 'done') {
                statusBg = "rgba(16, 185, 129, 0.1)"; // Completed (Green)
                statusText = "#10b981";
              } else if (task.status?.toLowerCase() === 'in-progress' || task.status?.toLowerCase() === 'active') {
                statusBg = "rgba(59, 130, 246, 0.1)"; // Active (Blue)
                statusText = "#3b82f6";
              } else if (task.status?.toLowerCase() === 'overdue') {
                statusBg = "rgba(239, 68, 68, 0.1)"; // Overdue (Red)
                statusText = "#ef4444";
              }

              return (
                <View key={task._id} style={[styles.listItem, idx !== summary.list.length - 1 && styles.listItemBorder]}>
                  <View style={styles.taskIconContainer}>
                    <Ionicons name="document-text-outline" size={20} color="#64748b" />
                  </View>
                  <View style={styles.listItemContent}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                      <View style={[styles.prioBadge, { backgroundColor: prioBg }]}>
                        <Text style={[styles.prioBadgeText, { color: prioText }]}>{task.priority.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.taskSub}>{task.endDateTime ? formatDateToDDMMYYYY(task.endDateTime) : 'No due date'}</Text>
                    </View>
                  </View>
                  <View style={styles.statusCol}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusText }]}>
                        {task.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No tasks found for this period.</Text>
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
  taskIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listItemContent: { flex: 1, paddingRight: 12 },
  taskTitle: { fontSize: 14, fontFamily: FONTS.displayBold, color: "#1e293b", marginRight: 6, flexShrink: 1 },
  prioBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  prioBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  taskSub: { fontSize: 11, color: "#64748b", fontFamily: FONTS.bodyMedium },
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

export default TaskReportScreen;
