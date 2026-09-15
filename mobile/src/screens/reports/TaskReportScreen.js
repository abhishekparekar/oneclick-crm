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
import { getTaskSummaryApi, getBITaskReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const PRIORITY_COLORS = {
  high: { bg: "#FEF2F2", text: "#DC2626" },
  medium: { bg: "#FEF3C7", text: "#D97706" },
  low: { bg: "#EFF6FF", text: "#2563EB" },
};

const TaskReportScreen = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [downloading, setDownloading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadSummary = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      
      const res = await getBITaskReportApi({ month, year, refresh }).catch(() => null);
      if (res?.data?.data) {
        const bi = res.data.data;
        setSummary({
          totalTasks: bi.kpis?.total || 0,
          onTimeTasks: bi.kpis?.completed || 0,
          delayedTasks: bi.kpis?.lateCompleted || 0,
          pendingTasks: bi.kpis?.pending || 0,
          overdueTasks: bi.kpis?.overdue || 0,
          completionRate: bi.kpis?.completionRate || 0,
          list: bi.records || [],
          priorityDistribution: bi.priorityDistribution || [],
          statusDistribution: bi.statusDistribution || [],
          departmentAnalytics: bi.departmentAnalytics || [],
          employeeAnalytics: bi.employeeAnalytics || [],
        });
      } else {
        const { data } = await getTaskSummaryApi({ month, year });
        setSummary(data);
      }
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

  const filteredTasks = useMemo(() => {
    const list = summary?.list || [];
    return list.filter((t) => {
      const s = search.toLowerCase();
      const assigneeName = t.assignedTo?.name || t.assignedTo?.fullName || t.assignedToName || "";
      const matchSearch = !s || (t.title || "").toLowerCase().includes(s) || assigneeName.toLowerCase().includes(s);
      const matchPriority =
        priorityFilter === "all" || (t.priority || "").toLowerCase() === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [summary, search, priorityFilter]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `Task_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Company Task Summary Report"],
        ["Period", `${month ? `Month ${month}` : "All Months"}, ${year || "All Years"}`],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Total Tasks", summary?.totalTasks || 0],
        ["On Time", summary?.onTimeTasks || summary?.onTime || 0],
        ["Delayed", summary?.delayedTasks || summary?.delayed || 0],
        ["Pending", summary?.pendingTasks || 0],
        ["Overdue", summary?.overdueTasks || 0],
      ];
      const headers = ["#", "Task Title", "Status", "Priority", "Due Date", "Assignee"];
      const rows = filteredTasks.map((t, idx) => [
        idx + 1,
        t.title || "Task",
        (t.status || "todo").toUpperCase(),
        (t.priority || "medium").toUpperCase(),
        t.endDateTime ? formatDateToDDMMYYYY(t.endDateTime) : "—",
        t.assignedTo?.name || "—",
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Tasks",
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
      const rows = filteredTasks
        .map(
          (t) => `
          <tr>
            <td>${t.title}</td>
            <td>${(t.status || "").toUpperCase()}</td>
            <td>${(t.priority || "").toUpperCase()}</td>
            <td>${t.endDateTime ? formatDateToDDMMYYYY(t.endDateTime) : "N/A"}</td>
          </tr>
        `
        )
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">Task Executive Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px; border-radius: 6px; flex: 1;">Total: <b>${summary.totalTasks}</b></div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px; border-radius: 6px; flex: 1; color: #059669;">On Time: <b>${summary.onTimeTasks || summary.onTime || 0}</b></div>
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; padding: 8px; border-radius: 6px; flex: 1; color: #D97706;">Pending: <b>${summary.pendingTasks}</b></div>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 8px; border-radius: 6px; flex: 1; color: #DC2626;">Overdue: <b>${summary.overdueTasks}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Title</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Priority</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Due Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`Task Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
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
          title="Task Report"
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
        title="Task Report"
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
        {/* Compact 5-KPI Deck */}
        <View style={styles.kpiDeck}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderLeftColor: "#0284C7" }]}>
              <Text style={styles.kpiLabel}>TOTAL TASKS</Text>
              <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{summary?.totalTasks || 0}</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
              <Text style={styles.kpiLabel}>ON TIME</Text>
              <Text style={[styles.kpiVal, { color: "#059669" }]}>
                {summary?.onTimeTasks || summary?.onTime || 0}
              </Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: "#F97316" }]}>
              <Text style={styles.kpiLabel}>DELAYED</Text>
              <Text style={[styles.kpiVal, { color: "#EA580C" }]}>
                {summary?.delayedTasks || summary?.delayed || 0}
              </Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
              <Text style={styles.kpiLabel}>PENDING</Text>
              <Text style={[styles.kpiVal, { color: "#D97706" }]}>{summary?.pendingTasks || 0}</Text>
            </View>

            <View style={[styles.kpiCard, { borderLeftColor: "#EF4444" }]}>
              <Text style={styles.kpiLabel}>OVERDUE</Text>
              <Text style={[styles.kpiVal, { color: "#DC2626" }]}>{summary?.overdueTasks || 0}</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterCard}>
          <View style={styles.priorityRow}>
            {[
              { label: "All", value: "all" },
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" },
            ].map((p) => {
              const isSel = priorityFilter === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.priorityPill, isSel && styles.priorityPillActive]}
                  onPress={() => setPriorityFilter(p.value)}
                >
                  <Text style={[styles.priorityPillText, isSel && styles.priorityPillTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={13} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks by title..."
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

        {/* Task Cards List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkbox-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptySub}>No tasks match the active filters or date period.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredTasks.map((t, idx) => {
              const pri = (t.priority || "medium").toLowerCase();
              const priCfg = PRIORITY_COLORS[pri] || PRIORITY_COLORS.medium;
              const isCompleted = (t.status || "").toLowerCase() === "done" || (t.status || "").toLowerCase() === "completed";

              return (
                <View key={t._id || idx} style={styles.taskCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskTitle} numberOfLines={2}>
                        {t.title}
                      </Text>
                    </View>

                    <View style={[styles.priBadge, { backgroundColor: priCfg.bg }]}>
                      <Text style={[styles.priText, { color: priCfg.text }]}>
                        {pri.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>STATUS</Text>
                      <Text
                        style={[
                          styles.metaVal,
                          isCompleted ? { color: "#059669" } : { color: "#0F172A" },
                        ]}
                      >
                        {(t.status || "todo").toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>DUE DATE</Text>
                      <Text style={styles.metaVal}>
                        {t.endDateTime ? formatDateToDDMMYYYY(t.endDateTime) : "No Due Date"}
                      </Text>
                    </View>

                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>ASSIGNEE</Text>
                      <Text style={styles.metaVal} numberOfLines={1}>
                        {t.assignedTo?.name || "Unassigned"}
                      </Text>
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
  kpiDeck: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
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
  priorityRow: {
    flexDirection: "row",
    gap: 6,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 5,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priorityPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  priorityPillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  priorityPillTextActive: {
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
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  taskTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  priBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  priText: {
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

export default TaskReportScreen;
