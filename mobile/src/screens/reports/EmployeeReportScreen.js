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
import { getEmployeeSummaryApi, getBIWorkforceReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const EmployeeReportScreen = () => {
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
      
      const res = await getBIWorkforceReportApi({ month, year, refresh }).catch(() => null);
      if (res?.data?.data) {
        const bi = res.data.data;
        const total = bi.kpis?.totalEmployees?.current ?? 0;
        const active = bi.kpis?.activeEmployees?.current ?? 0;
        setSummary({
          totalEmployees: total,
          activeEmployees: active,
          inactiveEmployees: Math.max(0, total - active),
          newJoinings: bi.kpis?.newJoinings?.current ?? 0,
          attritionRate: bi.kpis?.attritionRate ?? 0,
          list: bi.employeesList || [],
          departmentBreakdown: bi.departmentBreakdown || [],
          employmentTypeDistribution: bi.employmentTypeDistribution || [],
        });
      } else {
        const { data } = await getEmployeeSummaryApi({ month, year });
        setSummary(data);
      }
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

  const filteredEmployees = useMemo(() => {
    const list = summary?.list || [];
    return list.filter((e) => {
      const name = (e.name || `${e.firstName || ""} ${e.lastName || ""}`).toLowerCase();
      const code = (e.code || e.employeeCode || "").toLowerCase();
      const s = search.toLowerCase();
      const matchSearch = !s || name.includes(s) || code.includes(s);
      const matchStatus =
        statusFilter === "all" || (e.status || "").toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [summary, search, statusFilter]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `Employee_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Staff Roster Report"],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Total Employees", summary?.totalEmployees || 0],
        ["Active Staff", summary?.activeEmployees || 0],
        ["Inactive Staff", summary?.inactiveEmployees || 0],
      ];
      const headers = ["#", "Staff Name", "Employee Code", "Department", "Designation", "Status", "Joining Date"];
      const rows = filteredEmployees.map((e, idx) => [
        idx + 1,
        `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        e.employeeCode || "—",
        e.departmentId?.name || "General",
        e.designationId?.name || "—",
        (e.status || "active").toUpperCase(),
        e.createdAt ? formatDateToDDMMYYYY(e.createdAt) : "—",
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Employees",
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
      const rows = filteredEmployees
        .map(
          (e) => `
          <tr>
            <td>${e.firstName} ${e.lastName}</td>
            <td>${e.employeeCode || "N/A"}</td>
            <td>${e.designationId?.name || "N/A"}</td>
            <td>${(e.status || "").toUpperCase()}</td>
            <td>${e.createdAt ? formatDateToDDMMYYYY(e.createdAt) : "N/A"}</td>
          </tr>
        `
        )
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">Staff Directory Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px; border-radius: 6px; flex: 1;">Total: <b>${summary.totalEmployees}</b></div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px; border-radius: 6px; flex: 1; color: #059669;">Active: <b>${summary.activeEmployees}</b></div>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 8px; border-radius: 6px; flex: 1; color: #DC2626;">Inactive: <b>${summary.inactiveEmployees}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Staff Name</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Code</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Designation</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Joining Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`Employee Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
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
          title="Employee Report"
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
        title="Employee Report"
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
            <Text style={styles.kpiLabel}>TOTAL STAFF</Text>
            <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{summary?.totalEmployees || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>ACTIVE</Text>
            <Text style={[styles.kpiVal, { color: "#059669" }]}>{summary?.activeEmployees || 0}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#EF4444" }]}>
            <Text style={styles.kpiLabel}>INACTIVE</Text>
            <Text style={[styles.kpiVal, { color: "#DC2626" }]}>{summary?.inactiveEmployees || 0}</Text>
          </View>
        </View>

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <View style={styles.statusPillsRow}>
            {[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
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
              placeholder="Search by name or employee code..."
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

        {/* Staff Cards List */}
        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Staff Members Found</Text>
            <Text style={styles.emptySub}>No employee profiles match the search criteria.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredEmployees.map((e, idx) => {
              const empName = `${e.firstName || ""} ${e.lastName || ""}`.trim() || "Unknown";
              const isActive = (e.status || "").toLowerCase() === "active";

              return (
                <View key={e._id || idx} style={styles.empCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarText}>{empName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.empNameText} numberOfLines={1}>{empName}</Text>
                      <Text style={styles.empSubText}>
                        {e.employeeCode || "—"} • {e.departmentId?.name || "General"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        isActive ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          isActive ? { color: "#059669" } : { color: "#DC2626" },
                        ]}
                      >
                        {(e.status || "active").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>DESIGNATION</Text>
                      <Text style={styles.metaVal}>{e.designationId?.name || "Staff Member"}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>JOINING DATE</Text>
                      <Text style={styles.metaVal}>
                        {e.createdAt ? formatDateToDDMMYYYY(e.createdAt) : "—"}
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
  empCard: {
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
    color: "#0284C7",
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
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  statusInactive: {
    backgroundColor: "#FEF2F2",
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

export default EmployeeReportScreen;
