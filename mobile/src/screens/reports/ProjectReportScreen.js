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
import { getProjectSummaryApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const ProjectReportScreen = () => {
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

  const filteredProjects = useMemo(() => {
    const list = summary?.list || [];
    return list.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const s = search.toLowerCase();
      const matchSearch = !s || name.includes(s);
      const matchStatus =
        statusFilter === "all" || (p.status || "").toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [summary, search, statusFilter]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `Project_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Company Projects Summary Report"],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Total Projects", summary?.totalProjects || 0],
        ["Active Projects", summary?.activeProjects || 0],
        ["Completed Projects", summary?.completedProjects || 0],
      ];
      const headers = ["#", "Project Name", "Manager", "Status", "Priority", "Start Date", "Deadline"];
      const rows = filteredProjects.map((p, idx) => [
        idx + 1,
        p.name || "Project",
        `${p.projectManager?.firstName || "None"} ${p.projectManager?.lastName || ""}`.trim(),
        (p.status || "active").toUpperCase(),
        (p.priority || "medium").toUpperCase(),
        p.startDate ? formatDateToDDMMYYYY(p.startDate) : "—",
        p.endDate ? formatDateToDDMMYYYY(p.endDate) : "—",
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Projects",
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
      const rows = filteredProjects
        .map(
          (p) => `
          <tr>
            <td>${p.name}</td>
            <td>${p.projectManager?.firstName || "None"} ${p.projectManager?.lastName || ""}</td>
            <td>${(p.status || "").toUpperCase()}</td>
            <td>${(p.priority || "").toUpperCase()}</td>
          </tr>
        `
        )
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">Project Portfolio Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px; border-radius: 6px; flex: 1;">Total: <b>${summary.totalProjects}</b></div>
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px; border-radius: 6px; flex: 1; color: #2563EB;">Active: <b>${summary.activeProjects}</b></div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px; border-radius: 6px; flex: 1; color: #059669;">Completed: <b>${summary.completedProjects}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Project Name</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Manager</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Priority</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`Project Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
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
          title="Project Report"
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
        title="Project Report"
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
          <View style={[styles.kpiCard, { borderLeftColor: "#0284C7" }]}>
            <Text style={styles.kpiLabel}>TOTAL PROJECTS</Text>
            <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{summary?.totalProjects || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.kpiLabel}>ACTIVE</Text>
            <Text style={[styles.kpiVal, { color: "#2563EB" }]}>{summary?.activeProjects || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>COMPLETED</Text>
            <Text style={[styles.kpiVal, { color: "#059669" }]}>{summary?.completedProjects || 0}</Text>
          </View>
        </View>

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <View style={styles.statusPillsRow}>
            {[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Completed", value: "completed" },
            ].map((st) => {
              const isSel = statusFilter === st.value;
              return (
                <TouchableOpacity
                  key={st.value}
                  style={[styles.statusPill, isSel && styles.statusPillActive]}
                  onPress={() => setStatusFilter(st.value)}
                >
                  <Text style={[styles.statusPillText, isSel && styles.statusPillTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={13} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by project name..."
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

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Projects Found</Text>
            <Text style={styles.emptySub}>No projects match the selected criteria.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredProjects.map((p, idx) => {
              const isDone = (p.status || "").toLowerCase() === "completed";
              const mgr = `${p.projectManager?.firstName || "None"} ${p.projectManager?.lastName || ""}`.trim();

              return (
                <View key={p._id || idx} style={styles.projectCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarMini}>
                      <Ionicons name="briefcase" size={14} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.projectNameText} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.mgrSubText}>Manager: {mgr}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        isDone ? styles.statusDone : styles.statusActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          isDone ? { color: "#059669" } : { color: "#2563EB" },
                        ]}
                      >
                        {(p.status || "active").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>PRIORITY</Text>
                      <Text style={styles.metaVal}>{(p.priority || "Normal").toUpperCase()}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>DEADLINE</Text>
                      <Text style={styles.metaVal}>
                        {p.endDate ? formatDateToDDMMYYYY(p.endDate) : "No Deadline"}
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
    fontSize: 11,
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
  projectCard: {
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
  projectNameText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  mgrSubText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: "#EFF6FF",
  },
  statusDone: {
    backgroundColor: "#ECFDF5",
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

export default ProjectReportScreen;
