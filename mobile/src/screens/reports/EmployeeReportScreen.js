import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { PieChart } from "react-native-chart-kit";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getEmployeeSummaryApi } from "../../api/reportService";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const EmployeeReportScreen = () => {
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
      const { data } = await getEmployeeSummaryApi({ month, year });
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employee summary");
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

    const rows = summary.list.map(e => `
      <tr>
        <td>${e.firstName} ${e.lastName}</td>
        <td>${e.employeeCode || 'N/A'}</td>
        <td>${e.designationId?.name || 'N/A'}</td>
        <td>${e.status.toUpperCase()}</td>
        <td>${formatDateToDDMMYYYY(e.createdAt)}</td>
      </tr>
    `).join("");

    const html = `
      <div class="summary">
        <div class="stat-box">Total Employees<div class="stat-value">${summary.totalEmployees}</div></div>
        <div class="stat-box">Active<div class="stat-value" style="color: #16a34a">${summary.activeEmployees}</div></div>
        <div class="stat-box">Inactive/Terminated<div class="stat-value" style="color: #dc2626">${summary.inactiveEmployees}</div></div>
      </div>
      <h2>Employee List</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee Code</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Joined Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    await generateAndSharePDF(`Employee Report - ${month ? month + '/' : ''}${year || 'All Time'}`, html);
    setDownloading(false);
  };

  if (loading && !summary) {
    return (
      <View style={{ flex: 1 }}>
        <ReportHeader title="Employee Report" month={month} year={year} setMonth={setMonth} setYear={setYear} onDownload={() => {}} />
        <Loader />
      </View>
    );
  }

  const chartData = [
    { name: "Active", population: summary?.activeEmployees || 0, color: "#10b981", legendFontColor: "#475569", legendFontSize: 12 },
    { name: "Inactive", population: summary?.inactiveEmployees || 0, color: "#ef4444", legendFontColor: "#475569", legendFontSize: 12 },
  ].filter(d => d.population > 0);

  return (
    <View style={styles.container}>
      <ReportHeader 
        title="Employee Report" 
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
            <Text style={styles.statLabel}>TOTAL EMPLOYEES</Text>
            <Text style={[styles.statValue, { color: "#2563eb" }]}>{summary?.totalEmployees || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#10b981" }]}>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={[styles.statValue, { color: "#10b981" }]}>{summary?.activeEmployees || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: "#ef4444" }]}>
            <Text style={styles.statLabel}>INACTIVE</Text>
            <Text style={[styles.statValue, { color: "#ef4444" }]}>{summary?.inactiveEmployees || 0}</Text>
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
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Employee Directory</Text>
        <View style={styles.listContainer}>
          {summary?.list && summary.list.length > 0 ? (
            summary.list.map((e, idx) => {
              const empName = `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown';
              const initials = empName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              
              // Define status pill colors
              let statusBg = "rgba(239, 68, 68, 0.1)"; // Red 10% (inactive)
              let statusText = "#ef4444";
              if (e.status === 'active') {
                statusBg = "rgba(16, 185, 129, 0.1)"; // Emerald 10%
                statusText = "#10b981";
              }

              return (
                <View key={e._id} style={[styles.listItem, idx !== summary.list.length - 1 && styles.listItemBorder]}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={styles.itemTitle}>{empName}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="briefcase-outline" size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.itemSub} numberOfLines={1}>{e.designationId?.name || "No Designation"}</Text>
                    </View>
                  </View>
                  <View style={styles.statusCol}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusText }]}>
                        {e.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>Joined: {formatDateToDDMMYYYY(e.createdAt)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No employees found.</Text>
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
  statusCol: { alignItems: "flex-end", justifyContent: "center" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: { fontSize: 9, fontFamily: FONTS.bodyBold, letterSpacing: 0.3 },
  dateText: { fontSize: 10, color: "#94a3b8", marginTop: 4, fontFamily: FONTS.bodySemiBold },
  emptyText: { textAlign: "center", color: "#94a3b8", paddingVertical: 20, fontFamily: FONTS.bodyMedium },
});

export default EmployeeReportScreen;
