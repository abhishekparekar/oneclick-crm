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
import { getBIAuditReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const MODULE_COLORS = {
  employee: "#2563EB",
  attendance: "#10B981",
  leaves: "#F59E0B",
  tasks: "#8B5CF6",
  projects: "#EC4899",
  payroll: "#059669",
  auth: "#64748B",
  general: "#475569",
};

const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const day = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const y = dt.getFullYear();
    const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return `${day}/${m}/${y} ${time}`;
  } catch (_) {
    return d;
  }
};

const AuditReportScreen = ({ navigation }) => {
  const { user } = useAuth();
  const roleLower = (user?.role || "").toLowerCase();
  const isSuperAdmin = roleLower === "superadmin";
  const isCompanyAdmin = roleLower === "companyadmin" || roleLower === "admin";
  const canAccessAudit = isSuperAdmin || isCompanyAdmin;

  const now = new Date();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadData = async (refresh = false) => {
    if (!canAccessAudit) {
      setLoading(false);
      return;
    }

    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const res = await getBIAuditReportApi({ month, year, refresh });
      setData(res?.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit ledger");
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

  const filteredLogs = useMemo(() => {
    const list = data?.records || [];
    return list.filter((l) => {
      const s = search.toLowerCase().trim();
      const userMatch = (l.performedByName || "").toLowerCase().includes(s);
      const actionMatch = (l.action || "").toLowerCase().includes(s);
      const modMatch = (l.module || "").toLowerCase().includes(s);
      const searchOk = !s || userMatch || actionMatch || modMatch;

      const modOk =
        selectedModule === "all" ||
        (l.module || "").toLowerCase() === selectedModule.toLowerCase();

      return searchOk && modOk;
    });
  }, [data, search, selectedModule]);

  const handleExportExcel = async () => {
    if (exportingExcel || !data) return;
    try {
      setExportingExcel(true);
      const fileName = `Audit_Ledger_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "Audit Ledger Report"],
        ["Generated Date", new Date().toLocaleString("en-IN")],
        ["Period", `${month ? `Month ${month}` : "All Months"} / ${year || "All Years"}`],
        ["Total Audit Events", data?.totalLogs || 0],
        ["Filtered Records", filteredLogs.length],
      ];

      const headers = ["#", "Timestamp", "User", "Role", "Module", "Action", "IP Address"];
      const rows = filteredLogs.map((l, idx) => [
        idx + 1,
        fmtDateTime(l.createdAt),
        l.performedByName || "System",
        l.role || "Admin",
        l.module || "General",
        l.action || "Action",
        l.ipAddress || "—",
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Audit Ledger",
        summaryRows,
        headers,
        rows,
      });
    } catch (err) {
      console.warn("[AuditReportScreen] Export error:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  // Permission Guard
  if (!canAccessAudit) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="shield-outline" size={54} color="#EF4444" />
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.deniedText}>
          Audit Ledger reports are strictly limited to Company and System Administrators.
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
        title="Audit Ledger"
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

        {/* Overview Stats */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL LOGGED EVENTS</Text>
            <Text style={styles.kpiVal}>{data?.totalLogs || 0}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>FILTERED MATCHES</Text>
            <Text style={[styles.kpiVal, { color: "#2563EB" }]}>{filteredLogs.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={14} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user, action, module..."
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

        {/* Logs List */}
        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>IMMUTABLE AUDIT TRAIL</Text>

          {filteredLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Audit Records</Text>
              <Text style={styles.emptySub}>No administrative events found for this filter.</Text>
            </View>
          ) : (
            filteredLogs.map((log, idx) => {
              const modKey = (log.module || "general").toLowerCase();
              const badgeColor = MODULE_COLORS[modKey] || "#475569";
              return (
                <View key={log._id || idx} style={styles.logCard}>
                  <View style={styles.logTop}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.modBadge, { backgroundColor: `${badgeColor}15` }]}>
                        <Text style={[styles.modBadgeText, { color: badgeColor }]}>
                          {(log.module || "General").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.logAction}>{log.action}</Text>
                    </View>
                    <Text style={styles.logTime}>{fmtDateTime(log.createdAt)}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.logDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>User</Text>
                      <Text style={styles.detailValue}>{log.performedByName || "System"}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Role</Text>
                      <Text style={styles.detailValue}>{log.role || "Admin"}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>IP Address</Text>
                      <Text style={styles.detailValue}>{log.ipAddress || "127.0.0.1"}</Text>
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
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
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
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#0F172A",
    marginTop: 4,
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
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginLeft: 8,
    color: "#0F172A",
  },
  logsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  logTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  modBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  modBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
  },
  logAction: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: "#0F172A",
    flex: 1,
  },
  logTime: {
    fontSize: 10.5,
    fontFamily: FONTS.medium,
    color: "#94A3B8",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  logDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: "#94A3B8",
  },
  detailValue: {
    fontSize: 12,
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

export default AuditReportScreen;
