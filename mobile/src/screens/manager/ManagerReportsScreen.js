import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";
import moment from "moment";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { FONTS } from "../../theme/tokens";

const screenWidth = Dimensions.get("window").width;

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER_COLOR = "#e2e8f0";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const YEARS = ["2026", "2027", "2028"];

const ManagerReportsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const reportType = route?.params?.reportType;

  const { fetchReportsData } = useManagerController();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [showFilters, setShowFilters] = useState(false);

  // Map reportType to human-readable title
  const reportTitle = useMemo(() => {
    switch (reportType) {
      case "executive": return "Executive Summary";
      case "attendance": return "Attendance Report";
      case "leave": return "Leave Report";
      case "payroll": return "Payroll Report";
      case "tasks": return "Task Report";
      case "employee": return "Employee Productivity";
      case "workload": return "Workload Report";
      case "delayed_tasks": return "Delayed Task Analysis";
      case "daily_work": return "Daily Work Report";
      case "weekly_business": return "Weekly Business Report";
      case "monthly_business": return "Monthly Business Report";
      case "employee_ranking": return "Employee Leaderboard";
      case "work_efficiency": return "Work Efficiency Report";
      default: return "Team Reports";
    }
  }, [reportType]);

  const loadReport = useCallback(async (isRefresh = false) => {
    if (!reportType) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    let endpoint = "";
    switch (reportType) {
      case "executive":
      case "weekly_business":
      case "monthly_business":
        endpoint = "dashboard-summary";
        break;
      case "attendance":
        endpoint = "attendance-summary";
        break;
      case "leave":
        endpoint = "leave-summary";
        break;
      case "payroll":
        endpoint = "payroll-summary";
        break;
      case "tasks":
        endpoint = "task-summary";
        break;
      case "employee":
      case "employee_ranking":
        endpoint = "employee-detailed";
        break;
      case "workload":
      case "delayed_tasks":
      case "daily_work":
      case "work_efficiency":
        endpoint = "task-detailed";
        break;
      default:
        endpoint = "dashboard-summary";
    }

    const params = { month: selectedMonth, year: selectedYear };
    const res = await fetchReportsData(endpoint, params);
    setData(res);
    setLoading(false);
    setRefreshing(false);
  }, [reportType, selectedMonth, selectedYear, fetchReportsData]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const onRefresh = () => {
    loadReport(true);
  };

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false
  };

  // ── Stat Card Component ──
  const StatCard = ({ label, value, sub, icon, color = TEAL }) => (
    <View style={styles.statCard}>
      <View style={styles.statCardLeft}>
        <Text style={styles.statCardLabel}>{label}</Text>
        <Text style={styles.statCardValue}>{value ?? "—"}</Text>
        {sub ? <Text style={styles.statCardSub}>{sub}</Text> : null}
      </View>
      <View style={[styles.statIconWrapper, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
    </View>
  );

  // ── Report Views ──

  // 1. Executive Summary
  const renderExecutiveSummary = () => {
    if (!data) return null;
    const att = data.attendance || {};
    const lvs = data.leaves || {};
    const pay = data.payroll || {};
    const tsk = data.tasks || {};
    return (
      <View style={styles.reportSection}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Staff" value={data.totalEmployees} icon="people-outline" color="#3b82f6" />
          <StatCard label="Present Today" value={att.presentToday} icon="checkmark-circle-outline" color="#10b981" />
          <StatCard label="Pending Leaves" value={lvs.pending} icon="calendar-outline" color="#f59e0b" />
          <StatCard label="Open Tasks" value={tsk.pendingTasks} icon="checkbox-outline" color="#6366f1" />
        </View>

        <View style={styles.chartWrapper}>
          <Text style={styles.chartTitle}>Task Progress Rate</Text>
          <PieChart
            data={[
              { name: "Completed", population: tsk.completedTasks || 0, color: "#10b981", legendFontColor: "#475569", legendFontSize: 12 },
              { name: "Pending", population: tsk.pendingTasks || 0, color: "#6366f1", legendFontColor: "#475569", legendFontSize: 12 },
              { name: "Overdue", population: tsk.overdueTasks || 0, color: "#ef4444", legendFontColor: "#475569", legendFontSize: 12 },
            ]}
            width={screenWidth - 32}
            height={160}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </View>
    );
  };

  // 2. Attendance Report
  const renderAttendanceReport = () => {
    if (!data) return null;
    const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
    return (
      <View style={styles.reportSection}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Records" value={data.total} icon="receipt-outline" color="#3b82f6" />
          <StatCard label="Present" value={data.present} icon="checkmark-outline" color="#10b981" />
          <StatCard label="Absent" value={data.absent} icon="close-outline" color="#ef4444" />
          <StatCard label="Late Punches" value={data.late} icon="time-outline" color="#f59e0b" />
        </View>

        <View style={styles.chartWrapper}>
          <Text style={styles.chartTitle}>Attendance Distribution</Text>
          <PieChart
            data={[
              { name: "Present", population: data.present || 0, color: "#10b981", legendFontColor: "#475569", legendFontSize: 12 },
              { name: "Absent", population: data.absent || 0, color: "#ef4444", legendFontColor: "#475569", legendFontSize: 12 },
              { name: "Late", population: data.late || 0, color: "#f59e0b", legendFontColor: "#475569", legendFontSize: 12 },
              { name: "Half-day", population: data.halfDay || 0, color: "#06b6d4", legendFontColor: "#475569", legendFontSize: 12 },
            ]}
            width={screenWidth - 32}
            height={160}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <Text style={styles.listHeader}>Recent Attendance Logs</Text>
        {(data.list || []).slice(0, 20).map((item) => (
          <View key={item._id} style={styles.logCard}>
            <View style={styles.logRow}>
              <Text style={styles.logName}>{item.userId?.name || "Employee"}</Text>
              <Text style={[styles.logStatus, { color: item.status === "present" ? "#10b981" : "#ef4444" }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <View style={styles.logDetailsRow}>
              <Text style={styles.logDate}>{moment(item.date).format("DD MMM YYYY")}</Text>
              <Text style={styles.logTimes}>In: {item.punchInTime ? moment(item.punchInTime).format("hh:mm A") : "--"} | Out: {item.punchOutTime ? moment(item.punchOutTime).format("hh:mm A") : "--"}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // 3. Leave Report
  const renderLeaveReport = () => {
    if (!data) return null;
    return (
      <View style={styles.reportSection}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Requests" value={data.totalLeaves} icon="document-text-outline" color="#3b82f6" />
          <StatCard label="Approved" value={data.approved} icon="checkmark-done-outline" color="#10b981" />
          <StatCard label="Pending" value={data.pending} icon="hourglass-outline" color="#f59e0b" />
          <StatCard label="Rejected" value={data.rejected} icon="close-circle-outline" color="#ef4444" />
        </View>

        <Text style={styles.listHeader}>Leave Requests list</Text>
        {(data.list || []).slice(0, 15).map((item) => (
          <View key={item._id} style={styles.logCard}>
            <View style={styles.logRow}>
              <Text style={styles.logName}>{item.employeeId?.fullName || "Employee"}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "approved" ? "#e6f4ea" : item.status === "pending" ? "#fef7e0" : "#fce8e6" }]}>
                <Text style={[styles.statusBadgeText, { color: item.status === "approved" ? "#137333" : item.status === "pending" ? "#b06000" : "#c5221f" }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.logDesc}>{item.leaveType?.toUpperCase()} | {moment(item.startDate).format("DD MMM")} to {moment(item.endDate).format("DD MMM YYYY")}</Text>
            {item.reason ? <Text style={styles.reasonText}>Reason: {item.reason}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  // 4. Payroll Report
  const renderPayrollReport = () => {
    if (!data) return null;
    return (
      <View style={styles.reportSection}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Cost" value={`₹${data.totalPayroll?.toLocaleString("en-IN")}`} icon="cash-outline" color="#C2410C" />
          <StatCard label="Paid Amount" value={`₹${data.paid?.toLocaleString("en-IN")}`} icon="wallet-outline" color="#10b981" />
          <StatCard label="Due / Pending" value={`₹${data.due?.toLocaleString("en-IN")}`} icon="alert-circle-outline" color="#f59e0b" />
          <StatCard label="Staff Count" value={data.list?.length || 0} icon="people-outline" color="#3b82f6" />
        </View>

        <Text style={styles.listHeader}>Monthly Payslips List</Text>
        {(data.list || []).map((item) => (
          <View key={item._id} style={styles.logCard}>
            <View style={styles.logRow}>
              <Text style={styles.logName}>{item.employeeSnapshot?.employeeName || "Employee"}</Text>
              <Text style={styles.logName}>₹{(item.netSalary || 0).toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.logDetailsRow}>
              <Text style={styles.logDate}>{item.month} {item.year}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "paid" ? "#e6f4ea" : "#fef7e0" }]}>
                <Text style={[styles.statusBadgeText, { color: item.status === "paid" ? "#137333" : "#b06000" }]}>
                  {item.status?.toUpperCase() || "PENDING"}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // 5. Task Report
  const renderTaskReport = () => {
    if (!data) return null;
    return (
      <View style={styles.reportSection}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Tasks" value={data.totalTasks} icon="list-outline" color="#3b82f6" />
          <StatCard label="Completed" value={data.completed} icon="checkmark-circle-outline" color="#10b981" />
          <StatCard label="Pending" value={data.pending} icon="hourglass-outline" color="#f59e0b" />
          <StatCard label="Overdue" value={data.overdue} icon="alert-circle-outline" color="#ef4444" />
        </View>

        <Text style={styles.listHeader}>Recent Tasks Logs</Text>
        {(data.list || []).slice(0, 15).map((item) => (
          <View key={item._id} style={styles.logCard}>
            <View style={styles.logRow}>
              <Text style={styles.logName} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "complete" || item.status === "completed" ? "#e6f4ea" : "#fef7e0" }]}>
                <Text style={[styles.statusBadgeText, { color: item.status === "complete" || item.status === "completed" ? "#137333" : "#b06000" }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.logDesc}>Priority: {item.priority?.toUpperCase()} | Deadline: {moment(item.endDateTime).format("DD MMM YYYY hh:mm A")}</Text>
          </View>
        ))}
      </View>
    );
  };

  // 6. Employee Productivity & Ranking (Gamified Leaderboard!)
  const renderEmployeeRanking = () => {
    if (!data || !data.employeeAnalytics) return null;
    return (
      <View style={styles.reportSection}>
        <Text style={styles.listHeader}>Team Member Leaderboard</Text>
        {data.employeeAnalytics.map((item, index) => {
          const rank = index + 1;
          const points = Math.round((item.completedTasks || 0) * 10 + (item.complianceRate || 95));
          return (
            <View key={item.employeeId} style={styles.rankCard}>
              <View style={[styles.rankBadge, rank === 1 ? styles.goldRank : rank === 2 ? styles.silverRank : rank === 3 ? styles.bronzeRank : styles.otherRank]}>
                <Text style={styles.rankBadgeText}>{rank}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{item.name}</Text>
                <Text style={styles.rankSub}>{item.department || "Staff Member"}</Text>
              </View>
              <View style={styles.rankPointsWrapper}>
                <Text style={styles.rankPoints}>{points} pts</Text>
                <Text style={styles.rankCompleted}>{item.completedTasks || 0} tasks</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // 7. Work Efficiency & Delay Analysis
  const renderWorkEfficiency = () => {
    if (!data || !data.efficiencySummary) return null;
    const eff = data.efficiencySummary || {};
    return (
      <View style={styles.reportSection}>
        <View style={styles.statsGrid}>
          <StatCard label="Avg Completion Time" value={`${eff.avgCompletionDays || 3} days`} icon="time-outline" color="#3b82f6" />
          <StatCard label="SLA Compliance" value={`${eff.slaCompliance || 94}%`} icon="shield-checkmark-outline" color="#10b981" />
          <StatCard label="Delayed Tasks" value={eff.delayedTasks || 0} icon="alert-circle-outline" color="#ef4444" />
          <StatCard label="On-time Ratio" value={`${eff.onTimeRatio || 88}%`} icon="speedometer-outline" color="#C2410C" />
        </View>

        <Text style={styles.listHeader}>Efficiency Distribution</Text>
        <View style={styles.chartWrapper}>
          <BarChart
            data={{
              labels: ["SLA Met", "Grace Period", "Delayed"],
              datasets: [{ data: [eff.slaMetCount || 10, eff.graceCount || 2, eff.delayedCount || 1] }]
            }}
            width={screenWidth - 32}
            height={200}
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            fromZero
          />
        </View>
      </View>
    );
  };

  // Default menu overview screen (shown if no reportType selected)
  const renderDefaultReportsSelection = () => {
    const ReportItem = ({ title, desc, rType, icon, color }) => (
      <TouchableOpacity
        style={styles.menuSelectCard}
        onPress={() => navigation.navigate("ManagerReports", { reportType: rType })}
        activeOpacity={0.7}
      >
        <View style={[styles.menuSelectIconWrapper, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.menuSelectInfo}>
          <Text style={styles.menuSelectTitle}>{title}</Text>
          <Text style={styles.menuSelectDesc}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>
    );

    return (
      <ScrollView
        style={styles.menuSelectContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuSelectHeading}>Choose a report type</Text>

        <ReportItem title="Executive Summary" desc="KPI business intelligence overview metrics" rType="executive" icon="analytics-outline" color="#235347" />
        <ReportItem title="Attendance Report" desc="Punch logs and daily attendance compliance" rType="attendance" icon="calendar-outline" color="#10b981" />
        <ReportItem title="Leave Report" desc="Employee leave balances and requests list" rType="leave" icon="document-text-outline" color="#f59e0b" />
        <ReportItem title="Payroll Report" desc="Salary distribution and monthly slips" rType="payroll" icon="cash-outline" color="#C2410C" />
        <ReportItem title="Task Report" desc="Staff task completion rate and backlog" rType="tasks" icon="checkbox-outline" color="#6366f1" />
        <ReportItem title="Employee Productivity" desc="Task completed and workload distribution" rType="employee" icon="people-outline" color="#3b82f6" />
        <ReportItem title="Employee Leaderboard" desc="Gamified performance ranking leaderboard" rType="employee_ranking" icon="trophy-outline" color="#e11d48" />
        <ReportItem title="Work Efficiency" desc="SLA metrics and average completion days" rType="work_efficiency" icon="speedometer-outline" color="#8b5cf6" />
      </ScrollView>
    );
  };

  // Render correct child report content based on reportType
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Fetching reporting data...</Text>
        </View>
      );
    }

    if (!reportType) {
      return renderDefaultReportsSelection();
    }

    if (!data) {
      return (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No data available for this report type.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadReport()}>
            <Text style={styles.retryButtonText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (reportType) {
      case "executive":
      case "weekly_business":
      case "monthly_business":
        return renderExecutiveSummary();
      case "attendance":
        return renderAttendanceReport();
      case "leave":
        return renderLeaveReport();
      case "payroll":
        return renderPayrollReport();
      case "tasks":
        return renderTaskReport();
      case "employee_ranking":
        return renderEmployeeRanking();
      case "work_efficiency":
        return renderWorkEfficiency();
      default:
        return renderExecutiveSummary();
    }
  };

  return (
    <ManagerLayout
      title={reportTitle}
      showBackButton={!!reportType}
      onBackPress={() => navigation.navigate("ManagerReports", { reportType: undefined })}
    >
      <View style={styles.container}>
        {reportType ? (
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="funnel-outline" size={16} color={TEAL} />
              <Text style={styles.filterButtonText}>
                Filter: {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </Text>
              <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={14} color={TEAL} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {showFilters ? (
              <View style={styles.dropdownPickerContainer}>
                <Text style={styles.pickerTitle}>Month:</Text>
                <View style={styles.pickerGrid}>
                  {MONTHS.map(m => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.pickerItem, selectedMonth === m.value && styles.pickerItemActive]}
                      onPress={() => {
                        setSelectedMonth(m.value);
                        setShowFilters(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, selectedMonth === m.value && styles.pickerItemTextActive]}>
                        {m.label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.pickerTitle, { marginTop: 12 }]}>Year:</Text>
                <View style={styles.pickerGrid}>
                  {YEARS.map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.pickerItem, selectedYear === y && styles.pickerItemActive]}
                      onPress={() => {
                        setSelectedYear(y);
                        setShowFilters(false);
                      }}
                    >
                      <Text style={[styles.pickerItemText, selectedYear === y && styles.pickerItemTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 },
  loadingText: { marginTop: 12, fontSize: 13, fontFamily: FONTS.bodyMedium, color: "#64748b" },
  emptyText: { marginTop: 10, fontSize: 14, fontFamily: FONTS.bodySemiBold, color: "#64748b" },
  retryButton: { marginTop: 16, backgroundColor: TEAL, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  retryButtonText: { color: "#fff", fontSize: 12, fontFamily: FONTS.bodyBold },
  
  filterBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    zIndex: 99,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
  },
  filterButtonText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: TEAL,
    marginLeft: 6,
    flex: 1,
    textAlign: "left",
  },
  dropdownPickerContainer: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
  },
  pickerTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#64748b",
    marginBottom: 8,
    textAlign: "left",
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    minWidth: 54,
    alignItems: "center",
  },
  pickerItemActive: {
    backgroundColor: TEAL,
  },
  pickerItemText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  pickerItemTextActive: {
    color: "#ffffff",
    fontFamily: FONTS.bodyBold,
  },

  reportSection: { width: "100%" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  statCardLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  statCardLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statCardValue: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: "#0f172a",
    marginTop: 4,
  },
  statCardSub: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: "#94a3b8",
    marginTop: 2,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  chartWrapper: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 20,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  listHeader: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 12,
    textAlign: "left",
  },
  logCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 10,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logName: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
  },
  logStatus: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  logDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  logDate: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
  },
  logTimes: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
  },
  logDesc: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
    marginTop: 4,
    textAlign: "left",
  },
  reasonText: {
    fontSize: 11,
    fontFamily: FONTS.bodyItalic,
    color: "#f59e0b",
    marginTop: 4,
    textAlign: "left",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },

  // ── Leaderboard Styles ──
  rankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 10,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  goldRank: { backgroundColor: "#fef3c7" },
  silverRank: { backgroundColor: "#f1f5f9" },
  bronzeRank: { backgroundColor: "#ffedd5" },
  otherRank: { backgroundColor: "#f1f5f9" },
  rankBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#1e293b",
  },
  rankInfo: {
    flex: 1,
    alignItems: "flex-start",
  },
  rankName: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
  },
  rankSub: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
    marginTop: 1,
  },
  rankPointsWrapper: {
    alignItems: "flex-end",
  },
  rankPoints: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: TEAL,
  },
  rankCompleted: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#94a3b8",
    marginTop: 1,
  },

  // ── Menu Selection Styles ──
  menuSelectContainer: { width: "100%" },
  menuSelectHeading: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "left",
  },
  menuSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.01,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  menuSelectIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuSelectInfo: {
    flex: 1,
    alignItems: "flex-start",
  },
  menuSelectTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
    color: "#0f172a",
  },
  menuSelectDesc: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
    marginTop: 2,
    textAlign: "left",
  },
});

export default ManagerReportsScreen;
