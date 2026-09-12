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
import { getPayrollSummaryApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { FONTS } from "../../theme/tokens";

const fmt = (v) => `₹${(Number(v) || 0).toLocaleString("en-IN")}`;

const PayrollReportScreen = () => {
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

  const filteredPayrolls = useMemo(() => {
    const list = summary?.list || [];
    return list.filter((p) => {
      const emp = p.employeeId || {};
      const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
      const s = search.toLowerCase();
      const matchSearch = !s || empName.toLowerCase().includes(s);
      const isPaid = (p.status || "").toLowerCase() === "paid";
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && isPaid) ||
        (statusFilter === "due" && !isPaid);
      return matchSearch && matchStatus;
    });
  }, [summary, search, statusFilter]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `Payroll_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Company Payroll Summary Report"],
        ["Period", `${month ? `Month ${month}` : "All Months"}, ${year || "All Years"}`],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Total Payroll Expense", summary?.totalPayroll || 0],
        ["Total Paid", summary?.paid || 0],
        ["Total Due", summary?.due || 0],
      ];
      const headers = ["#", "Staff Name", "Period", "Attendance Rate", "Performance", "Net Salary", "Status"];
      const rows = filteredPayrolls.map((p, idx) => {
        const emp = p.employeeId || {};
        const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
        return [
          idx + 1,
          empName,
          `${p.month || ""} ${p.year || ""}`,
          p.attendanceRate !== undefined ? `${p.attendanceRate.toFixed(1)}%` : "—",
          p.performanceScore !== undefined ? `${p.performanceScore.toFixed(1)}%` : "—",
          p.netSalary || 0,
          (p.status || "generated").toUpperCase(),
        ];
      });

      await exportToExcel({
        fileName,
        sheetName: "Payroll Report",
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
      const rows = filteredPayrolls
        .map((p) => {
          const emp = p.employeeId || {};
          const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
          return `
            <tr>
              <td>${empName}</td>
              <td>${p.month || ""} ${p.year || ""}</td>
              <td>₹${(p.netSalary || 0).toLocaleString("en-IN")}</td>
              <td>${(p.status || "generated").toUpperCase()}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">Payroll Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px; border-radius: 6px; flex: 1;">Total: <b>₹${(summary.totalPayroll || 0).toLocaleString("en-IN")}</b></div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px; border-radius: 6px; flex: 1; color: #059669;">Paid: <b>₹${(summary.paid || 0).toLocaleString("en-IN")}</b></div>
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; padding: 8px; border-radius: 6px; flex: 1; color: #D97706;">Due: <b>₹${(summary.due || 0).toLocaleString("en-IN")}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Staff</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Period</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Net Salary</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`Payroll Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
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
          title="Payroll Report"
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
        title="Payroll Report"
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
            <Text style={styles.kpiLabel}>TOTAL PAYROLL</Text>
            <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{fmt(summary?.totalPayroll)}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>PAID OUT</Text>
            <Text style={[styles.kpiVal, { color: "#059669" }]}>{fmt(summary?.paid)}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>OUTSTANDING / DUE</Text>
            <Text style={[styles.kpiVal, { color: "#D97706" }]}>{fmt(summary?.due)}</Text>
          </View>
        </View>

        {/* Filter Toolbar */}
        <View style={styles.filterCard}>
          <View style={styles.statusPillsRow}>
            {[
              { label: "All", value: "all" },
              { label: "Paid", value: "paid" },
              { label: "Due", value: "due" },
            ].map((opt) => {
              const isSel = statusFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.statusPill, isSel && styles.statusPillActive]}
                  onPress={() => setStatusFilter(opt.value)}
                >
                  <Text style={[styles.statusPillText, isSel && styles.statusPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.searchRow}>
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
        </View>

        {/* List */}
        {filteredPayrolls.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cash-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Payroll Records Found</Text>
            <Text style={styles.emptySub}>No payroll data available for the chosen filters.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredPayrolls.map((p, idx) => {
              const emp = p.employeeId || {};
              const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
              const isPaid = (p.status || "").toLowerCase() === "paid";

              return (
                <View key={p._id || idx} style={styles.payrollCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarText}>{empName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.empNameText} numberOfLines={1}>{empName}</Text>
                      <Text style={styles.empSubText}>
                        Period: {p.month || ""} {p.year || ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        isPaid ? styles.statusPaid : styles.statusDue,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          isPaid ? { color: "#059669" } : { color: "#D97706" },
                        ]}
                      >
                        {isPaid ? "PAID" : "DUE"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>ATTENDANCE</Text>
                      <Text style={styles.metaVal}>
                        {p.attendanceRate !== undefined ? `${p.attendanceRate.toFixed(1)}%` : "100%"}
                      </Text>
                    </View>

                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>PERFORMANCE</Text>
                      <Text style={styles.metaVal}>
                        {p.performanceScore !== undefined ? `${p.performanceScore.toFixed(1)}%` : "—"}
                      </Text>
                    </View>

                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>NET SALARY</Text>
                      <Text style={[styles.metaVal, { color: "#059669", fontFamily: FONTS.displayBold }]}>
                        {fmt(p.netSalary)}
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
    fontSize: 13,
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
  payrollCard: {
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
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#16A34A",
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
  statusPaid: {
    backgroundColor: "#ECFDF5",
  },
  statusDue: {
    backgroundColor: "#FEF3C7",
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

export default PayrollReportScreen;
