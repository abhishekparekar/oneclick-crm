import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { useAuth } from "../../context/AuthContext";
import { getBIPayrollReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const PayrollReportScreen = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  const roleLower = (user?.role || "").toLowerCase();
  const isSuperAdmin = roleLower === "superadmin";
  const isCompanyAdmin = roleLower === "companyadmin" || roleLower === "admin";
  const isHR = roleLower === "hr";

  const canAccessPayroll =
    isSuperAdmin ||
    isCompanyAdmin ||
    (isHR && (hasPermission("payroll", "view") || hasPermission("payroll"))) ||
    user?.permissions?.payroll?.view === true ||
    user?.permissions?.payroll === true;

  const now = new Date();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadData = async (refresh = false) => {
    if (!canAccessPayroll) {
      setLoading(false);
      return;
    }

    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const res = await getBIPayrollReportApi({ month, year, refresh });
      setData(res?.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payroll report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [month, year])
  );

  const filteredRecords = useMemo(() => {
    const list = data?.records || [];
    return list.filter((r) => {
      const name = (r.employeeName || "").toLowerCase();
      const s = search.toLowerCase().trim();
      const matchSearch = !s || name.includes(s);
      const matchStatus =
        statusFilter === "all" || (r.status || "pending").toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  const kpis = data?.kpis || {};

  const handleExportExcel = async () => {
    if (exportingExcel || !data) return;
    try {
      setExportingExcel(true);
      const fileName = `Payroll_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Payroll Summary Report"],
        ["Generated Date", new Date().toLocaleString("en-IN")],
        ["Period", `${month ? `Month ${month}` : "All Months"} / ${year || "All Years"}`],
        ["Gross Payroll", `₹${(kpis.grossPayroll || 0).toLocaleString("en-IN")}`],
        ["Net Disbursed / Due", `₹${(kpis.netPayroll || 0).toLocaleString("en-IN")}`],
        ["Disbursed (Paid)", `₹${(kpis.disbursedPaid || 0).toLocaleString("en-IN")}`],
        ["Pending (Due)", `₹${(kpis.pendingDue || 0).toLocaleString("en-IN")}`],
        ["Total Deductions", `₹${(kpis.totalDeductions || 0).toLocaleString("en-IN")}`],
        ["Total Payslips", kpis.slipsCount || 0],
      ];

      const headers = ["#", "Staff Name", "Period (Month/Year)", "Basic Salary (₹)", "Net Payable (₹)", "Status"];
      const rows = filteredRecords.map((r, idx) => [
        idx + 1,
        r.employeeName || "Employee",
        `${r.month || "—"}/${r.year || "—"}`,
        r.basicSalary || 0,
        r.netSalary || 0,
        (r.status || "pending").toUpperCase(),
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Payroll Summary",
        summaryRows,
        headers,
        rows,
      });
    } catch (err) {
      console.warn("[PayrollReportScreen] Export error:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  // Permission Guard Screen
  if (!canAccessPayroll) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="lock-closed-outline" size={54} color="#EF4444" />
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.deniedText}>
          You do not have permission to view payroll intelligence or salary reports.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Return to Reports</Text>
        </TouchableOpacity>
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
        onExportExcel={handleExportExcel}
        exportingExcel={exportingExcel}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {loading && !data ? (
          <View style={styles.loaderBox}>
            <Loader />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Financial KPI Deck */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.kpiLabel}>GROSS PAYROLL</Text>
            <Text style={[styles.kpiVal, { color: "#2563EB" }]}>
              ₹{(kpis.grossPayroll || 0).toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>DISBURSED (PAID)</Text>
            <Text style={[styles.kpiVal, { color: "#10B981" }]}>
              ₹{(kpis.disbursedPaid || 0).toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>PENDING (DUE)</Text>
            <Text style={[styles.kpiVal, { color: "#F59E0B" }]}>
              ₹{(kpis.pendingDue || 0).toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#EF4444" }]}>
            <Text style={styles.kpiLabel}>DEDUCTIONS</Text>
            <Text style={[styles.kpiVal, { color: "#DC2626" }]}>
              ₹{(kpis.totalDeductions || 0).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Status Filters & Search */}
        <View style={styles.filterSection}>
          <View style={styles.statusChips}>
            {["all", "paid", "pending"].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.statusChip, statusFilter === st && styles.statusChipActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    statusFilter === st && styles.statusChipTextActive,
                  ]}
                >
                  {st.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={14} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by staff name..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Ledger */}
        <View style={styles.recordsSection}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsTitle}>PAYSLIP DISBURSEMENTS</Text>
            <Text style={styles.recordsCount}>{filteredRecords.length} Records</Text>
          </View>

          {filteredRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Payroll Records</Text>
              <Text style={styles.emptySub}>No payslips found matching the active filters.</Text>
            </View>
          ) : (
            filteredRecords.map((r, idx) => {
              const isPaid = (r.status || "").toLowerCase() === "paid";
              return (
                <View key={r._id || idx} style={styles.payrollCard}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.empName}>{r.employeeName}</Text>
                      <Text style={styles.periodText}>
                        Period: {r.month ? `${r.month} / ` : ""}{r.year || "—"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isPaid ? "#ECFDF5" : "#FEF3C7" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: isPaid ? "#059669" : "#D97706" },
                        ]}
                      >
                        {(r.status || "pending").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.salaryRow}>
                    <View>
                      <Text style={styles.salaryLabel}>Basic Salary</Text>
                      <Text style={styles.salaryVal}>
                        ₹{(r.basicSalary || 0).toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.salaryLabel}>Net Payable</Text>
                      <Text style={[styles.salaryVal, { color: "#0F172A", fontFamily: FONTS.bold }]}>
                        ₹{(r.netSalary || 0).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  deniedTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#0F172A",
    marginTop: 14,
  },
  deniedText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderBox: {
    paddingVertical: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginLeft: 8,
    flex: 1,
    fontFamily: FONTS.medium,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 40) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    margin: 4,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
    color: "#64748B",
    letterSpacing: 0.4,
  },
  kpiVal: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  statusChips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  statusChipActive: {
    backgroundColor: "#0F172A",
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: "#475569",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginLeft: 8,
    color: "#0F172A",
  },
  recordsSection: {
    marginTop: 4,
  },
  recordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recordsTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#475569",
    letterSpacing: 0.5,
  },
  recordsCount: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: "#94A3B8",
  },
  payrollCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  empName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#0F172A",
  },
  periodText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: "#64748B",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  salaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salaryLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: "#64748B",
  },
  salaryVal: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: "#334155",
    marginTop: 2,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#475569",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#94A3B8",
    marginTop: 4,
  },
});

export default PayrollReportScreen;
