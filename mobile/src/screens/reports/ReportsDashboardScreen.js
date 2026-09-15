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
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import { useAuth } from "../../context/AuthContext";
import { getBIExecutiveReportApi, getDashboardSummaryApi } from "../../api/reportService";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const ReportsDashboardScreen = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const roleLower = (user?.role || "").toLowerCase();
  const isSuperAdmin = roleLower === "superadmin" || roleLower === "subsuperadmin" || roleLower === "sub-superadmin";
  const isCompanyAdmin = roleLower === "companyadmin" || roleLower === "admin";
  const isHR = roleLower === "hr";

  // Dynamic module access evaluations
  const canAccessAttendance = isSuperAdmin || hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessLeaves = isSuperAdmin || hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessTasks = isSuperAdmin || hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessProjects = isSuperAdmin || hasPermission("projects", "view") || hasPermission("projects");
  const canAccessLeads = isSuperAdmin || hasPermission("leads", "view") || hasPermission("leads");
  const canAccessWorkforce = isSuperAdmin || isCompanyAdmin || isHR || hasPermission("teamMembers") || hasPermission("employees");
  const canAccessPerformance = isSuperAdmin || hasPermission("performance", "view") || hasPermission("performance");
  
  // Payroll: STRICTLY permitted only when explicit payroll permission exists
  const canAccessPayroll =
    isSuperAdmin ||
    isCompanyAdmin ||
    (isHR && (hasPermission("payroll", "view") || hasPermission("payroll"))) ||
    user?.permissions?.payroll?.view === true ||
    user?.permissions?.payroll === true;

  // Audit: Only SuperAdmin and CompanyAdmin
  const canAccessAudit = isSuperAdmin || isCompanyAdmin;

  // Executive BI: Admins, HR, or users with overall reports access
  const canAccessExecutive = isSuperAdmin || isCompanyAdmin || isHR || hasPermission("reports");

  // Organization (Departments, Designations, Holidays, Announcements)
  const canAccessOrganization = isSuperAdmin || isCompanyAdmin || isHR || hasPermission("company");

  const loadData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      if (isCompanyAdmin || isHR || isSuperAdmin) {
        try {
          const res = await getBIExecutiveReportApi({ refresh });
          if (res?.data?.data) {
            setSummary(res.data.data);
          } else {
            const fallback = await getDashboardSummaryApi({ refresh });
            setSummary(fallback?.data || null);
          }
        } catch (_) {
          const fallback = await getDashboardSummaryApi({ refresh });
          setSummary(fallback?.data || null);
        }
      } else {
        // Employee / Manager scope
        const res = await getDashboardSummaryApi({ refresh });
        setSummary(res?.data || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reports overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Dynamic Report Catalog filtered strictly by permission
  const reportCatalog = useMemo(() => {
    const list = [];

    if (canAccessExecutive) {
      list.push({
        id: "executive",
        title: "Executive Business BI",
        subtitle: "Key KPIs, pulse metrics & cross-functional intelligence",
        icon: "sparkles",
        color: "#2563EB",
        badge: "Overview",
        route: "CompanyReportsDashboard",
      });
    }

    if (canAccessAttendance) {
      list.push({
        id: "attendance",
        title: "Attendance Report",
        subtitle: "Monthly employee summary & daily punch logs",
        icon: "calendar",
        color: "#10B981",
        badge: "Core",
        route: "AttendanceReport",
      });
    }

    if (canAccessLeaves) {
      list.push({
        id: "leave",
        title: "Leave Report",
        subtitle: "Applications, approval rates & department consumption",
        icon: "time",
        color: "#F59E0B",
        badge: "Time-off",
        route: "LeaveReport",
      });
    }

    if (canAccessTasks) {
      list.push({
        id: "tasks",
        title: "Task & Operations Report",
        subtitle: "Workload distribution, turnaround time & overdue analysis",
        icon: "checkbox",
        color: "#8B5CF6",
        badge: "Operations",
        route: "TaskReport",
      });
    }

    if (canAccessProjects) {
      list.push({
        id: "projects",
        title: "Project Portfolio Report",
        subtitle: "Milestones tracking, schedules & delivery velocity",
        icon: "folder-open",
        color: "#EC4899",
        badge: "Projects",
        route: "ProjectReport",
      });
    }

    if (canAccessLeads) {
      list.push({
        id: "leads",
        title: "CRM & Leads Report",
        subtitle: "Pipeline stages, conversion rates & sales rep ledger",
        icon: "call",
        color: "#0284C7",
        badge: "Sales",
        route: "LeadReport",
      });
    }

    if (canAccessWorkforce) {
      list.push({
        id: "workforce",
        title: "Workforce & Employee Report",
        subtitle: "Staff directory, joining/resignation counts & department ratios",
        icon: "people",
        color: "#C2410C",
        badge: "HR",
        route: "EmployeeReport",
      });
    }

    if (canAccessPerformance) {
      list.push({
        id: "performance",
        title: "Performance Report",
        subtitle: "Multi-factor scorecards, productivity tiers & rankings",
        icon: "trophy",
        color: "#D97706",
        badge: "Analytics",
        route: "PerformanceReport",
      });
    }

    if (canAccessPayroll) {
      list.push({
        id: "payroll",
        title: "Payroll Summary Report",
        subtitle: "Disbursements, deductions, net salary & disbursement status",
        icon: "receipt",
        color: "#059669",
        badge: "Finance",
        route: "PayrollReport",
      });
    }

    if (canAccessOrganization) {
      list.push({
        id: "organization",
        title: "Organization Structure Report",
        subtitle: "Departments, designations, holiday schedules & notices",
        icon: "business",
        color: "#4F46E5",
        badge: "Company",
        route: "OrganizationReport",
      });
    }

    if (canAccessAudit) {
      list.push({
        id: "audit",
        title: "Audit Ledger Report",
        subtitle: "Immutable security trail, administrative activities & IP logs",
        icon: "shield-checkmark",
        color: "#475569",
        badge: "Security",
        route: "AuditReport",
      });
    }

    return list;
  }, [
    canAccessExecutive,
    canAccessAttendance,
    canAccessLeaves,
    canAccessTasks,
    canAccessProjects,
    canAccessLeads,
    canAccessWorkforce,
    canAccessPerformance,
    canAccessPayroll,
    canAccessOrganization,
    canAccessAudit,
  ]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reportCatalog;
    const q = searchQuery.toLowerCase().trim();
    return reportCatalog.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q) || r.badge.toLowerCase().includes(q)
    );
  }, [reportCatalog, searchQuery]);

  // Key KPI values
  const kpis = summary?.kpis || {};
  const healthIntelligence = summary?.healthIntelligence || {};
  const healthScore = healthIntelligence.businessHealthScore || (kpis.attendanceRate?.current ? Math.round(kpis.attendanceRate.current) : 94);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.openDrawer && navigation.openDrawer()}
          >
            <Ionicons name="menu-outline" size={26} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Reports & Analytics</Text>
            <Text style={styles.headerSubtitle}>
              {user?.role ? `${user.role} Intelligence Hub` : "HRMS Report Suite"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadData(true)}
          >
            <Ionicons name="refresh-outline" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Search Filter */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reports by module, name..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {loading && !summary ? (
          <View style={styles.loadingBox}>
            <Loader />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* KPI Intelligence Pulse Cards (When available) */}
        {summary ? (
          <View style={styles.statsSection}>
            <View style={styles.statGrid}>
              <View style={[styles.statCard, { borderLeftColor: "#2563EB" }]}>
                <Text style={styles.statCardLabel}>HEALTH SCORE</Text>
                <Text style={[styles.statCardValue, { color: "#2563EB" }]}>{healthScore}%</Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
                <Text style={styles.statCardLabel}>ATTENDANCE</Text>
                <Text style={[styles.statCardValue, { color: "#10B981" }]}>
                  {kpis.attendanceRate?.current !== undefined
                    ? `${kpis.attendanceRate.current}%`
                    : summary?.attendance?.presentToday !== undefined
                    ? `${summary.attendance.presentToday} Present`
                    : "—"}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#8B5CF6" }]}>
                <Text style={styles.statCardLabel}>TASK COMPLETION</Text>
                <Text style={[styles.statCardValue, { color: "#8B5CF6" }]}>
                  {kpis.taskCompletionRate?.current !== undefined
                    ? `${kpis.taskCompletionRate.current}%`
                    : summary?.tasks?.completedTasks !== undefined
                    ? `${summary.tasks.completedTasks} Done`
                    : "—"}
                </Text>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#C2410C" }]}>
                <Text style={styles.statCardLabel}>WORKFORCE</Text>
                <Text style={[styles.statCardValue, { color: "#C2410C" }]}>
                  {kpis.activeEmployees?.current ?? summary?.totalEmployees ?? "—"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Available Reports Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AVAILABLE MODULE REPORTS</Text>
          <Text style={styles.sectionCount}>
            {filteredReports.length} {filteredReports.length === 1 ? "Report" : "Reports"} Available
          </Text>
        </View>

        {/* Reports Grid / List */}
        {filteredReports.length > 0 ? (
          <View style={styles.reportList}>
            {filteredReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                activeOpacity={0.7}
                onPress={() => {
                  try {
                    navigation.navigate(report.route);
                  } catch (e) {
                    console.warn(`Cannot navigate to route: ${report.route}`, e);
                  }
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${report.color}15` }]}>
                  <Ionicons name={report.icon} size={24} color={report.color} />
                </View>

                <View style={styles.reportInfo}>
                  <View style={styles.reportTitleRow}>
                    <Text style={styles.reportTitle} numberOfLines={1}>
                      {report.title}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: `${report.color}18` }]}>
                      <Text style={[styles.badgeText, { color: report.color }]}>
                        {report.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reportSubtitle} numberOfLines={2}>
                    {report.subtitle}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No matching reports</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? "Try searching with another keyword" : "No report modules are currently permitted for your role."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  menuButton: {
    padding: 6,
    marginRight: 10,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: "#64748B",
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: "#0F172A",
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    fontFamily: FONTS.medium,
    marginLeft: 8,
    flex: 1,
  },
  statsSection: {
    marginBottom: 20,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  statCard: {
    width: (width - 40) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    margin: 4,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: "#64748B",
    letterSpacing: 0.5,
  },
  statCardValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#475569",
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: "#94A3B8",
  },
  reportList: {
    gap: 10,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
    paddingRight: 6,
  },
  reportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#0F172A",
    flex: 1,
    marginRight: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
  },
  reportSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#64748B",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: "#475569",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});

export default ReportsDashboardScreen;
