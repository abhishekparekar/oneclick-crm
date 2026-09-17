import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getLeaveBalanceApi } from "../../api/leaveService";

const EmployeeLeaveBalanceScreen = ({ navigation }) => {
  const [balance, setBalance] = useState({ casual: 12, sick: 6, annual: 15, lop: 0 });
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getLeaveBalanceApi();
      if (res?.data && res.data.success) {
        setBalance(res.data.balance || res.data);
        if (res.data.monthlyMetrics) {
          setMetrics(res.data.monthlyMetrics);
        }
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBalance(false);
  };

  const ALLOCATIONS = {
    casual: metrics?.annualAllocated?.casual ?? (balance.casual != null ? Math.max(12, balance.casual) : 12),
    sick: metrics?.annualAllocated?.sick ?? (balance.sick != null ? Math.max(6, balance.sick) : 6),
    annual: metrics?.annualAllocated?.annual ?? (balance.annual != null ? Math.max(15, balance.annual) : 15),
  };

  const getPercent = (value, max) => {
    if (max <= 0) return 0;
    const pct = (value / max) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  };

  return (
    <EmployeeLayout navigation={navigation} title="Leave Balances" backEnabled={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Policy & Balances</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1268D9"]} tintColor="#1268D9" />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#1268D9" style={{ marginTop: 40 }} />
          ) : (
            <View>
              {/* ── 1. Month-Wise Policy & Accruals Hero Card ── */}
              <LinearGradient
                colors={["#082B52", "#1268D9", "#1D7DF2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.heroBadge}>
                    <Ionicons name="calendar-outline" size={13} color="#93C5FD" />
                    <Text style={styles.heroBadgeText}>
                      {metrics?.currentMonthName || "Current Month"} {metrics?.currentYear || new Date().getFullYear()}
                    </Text>
                  </View>
                  <View style={styles.heroCapPill}>
                    <Text style={styles.heroCapText}>
                      Monthly Cap: {metrics?.monthlyCap ?? balance?.monthlyLeaves ?? 3} Days/Mo
                    </Text>
                  </View>
                </View>

                <View style={styles.heroMiddleSection}>
                  <Text style={styles.heroAllowedCount}>
                    {metrics?.allowedRemainingThisMonth ?? 3}
                  </Text>
                  <Text style={styles.heroAllowedLabel}>
                    Days Allowed Remaining This Month
                  </Text>
                  <Text style={styles.heroPolicyNote}>
                    Even if accumulated leave is higher, monthly limit permits max {metrics?.monthlyCap ?? 3} days per month.
                  </Text>
                </View>

                {/* 3 Metric Mini Cards inside Hero */}
                <View style={styles.heroMetricsGrid}>
                  <View style={styles.heroMiniCard}>
                    <Text style={styles.heroMiniLabel}>MONTH QUOTA</Text>
                    <Text style={styles.heroMiniValue}>
                      {metrics?.currentMonthQuota?.total ?? 2.75} <Text style={styles.heroMiniUnit}>Days</Text>
                    </Text>
                  </View>

                  <View style={styles.heroMiniCard}>
                    <Text style={styles.heroMiniLabel}>CARRIED OVER</Text>
                    <Text style={styles.heroMiniValue}>
                      {metrics?.carriedOver?.total ?? 0} <Text style={styles.heroMiniUnit}>Days</Text>
                    </Text>
                  </View>

                  <View style={styles.heroMiniCard}>
                    <Text style={styles.heroMiniLabel}>TAKEN THIS MO</Text>
                    <Text style={styles.heroMiniValue}>
                      {metrics?.currentMonthUsed?.totalPaid ?? 0} <Text style={styles.heroMiniUnit}>Days</Text>
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* ── 2. Annual Quota Distribution Section Header ── */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>LEAVE TYPE BALANCES</Text>
                <Text style={styles.sectionSubtitle}>Month-wise accrual with auto-computed annual totals</Text>
              </View>

              {/* Casual Leave */}
              <AppCard style={styles.balanceCard}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
                    <Ionicons name="briefcase" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Casual Leave (CL)</Text>
                    <Text style={styles.balanceAllocText}>
                      Rate: {metrics?.monthlyRates?.casual ?? (balance.monthlyCasual || 1)} Day/Mo • Annual: {ALLOCATIONS.casual} Days
                    </Text>
                    {metrics?.carriedOver?.casual !== undefined && (
                      <Text style={styles.carriedOverNote}>
                        Past carry-over: {metrics.carriedOver.casual} Days
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.balanceNumber, { color: "#3B82F6" }]}>{balance.casual ?? 12}</Text>
                    <Text style={styles.remainingUnit}>Remaining</Text>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${getPercent(balance.casual, ALLOCATIONS.casual)}%`, backgroundColor: "#3B82F6" },
                    ]}
                  />
                </View>
                <View style={styles.barLabelsRow}>
                  <Text style={styles.barLabelText}>0 Days</Text>
                  <Text style={styles.barLabelText}>{ALLOCATIONS.casual} Days Annual</Text>
                </View>
              </AppCard>

              {/* Sick Leave */}
              <AppCard style={styles.balanceCard}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="medical" size={20} color="#10B981" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Sick Leave (SL)</Text>
                    <Text style={styles.balanceAllocText}>
                      Rate: {metrics?.monthlyRates?.sick ?? (balance.monthlySick || 0.5)} Day/Mo • Annual: {ALLOCATIONS.sick} Days
                    </Text>
                    {metrics?.carriedOver?.sick !== undefined && (
                      <Text style={styles.carriedOverNote}>
                        Past carry-over: {metrics.carriedOver.sick} Days
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.balanceNumber, { color: "#10B981" }]}>{balance.sick ?? 6}</Text>
                    <Text style={styles.remainingUnit}>Remaining</Text>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${getPercent(balance.sick, ALLOCATIONS.sick)}%`, backgroundColor: "#10B981" },
                    ]}
                  />
                </View>
                <View style={styles.barLabelsRow}>
                  <Text style={styles.barLabelText}>0 Days</Text>
                  <Text style={styles.barLabelText}>{ALLOCATIONS.sick} Days Annual</Text>
                </View>
              </AppCard>

              {/* Annual / Privilege Leave */}
              <AppCard style={styles.balanceCard}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#F5F3FF" }]}>
                    <Ionicons name="ribbon" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Privilege / Annual (PL)</Text>
                    <Text style={styles.balanceAllocText}>
                      Rate: {metrics?.monthlyRates?.annual ?? (balance.monthlyAnnual || 1.25)} Day/Mo • Annual: {ALLOCATIONS.annual} Days
                    </Text>
                    {metrics?.carriedOver?.annual !== undefined && (
                      <Text style={styles.carriedOverNote}>
                        Past carry-over: {metrics.carriedOver.annual} Days
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.balanceNumber, { color: "#8B5CF6" }]}>{balance.annual ?? 15}</Text>
                    <Text style={styles.remainingUnit}>Remaining</Text>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${getPercent(balance.annual, ALLOCATIONS.annual)}%`, backgroundColor: "#8B5CF6" },
                    ]}
                  />
                </View>
                <View style={styles.barLabelsRow}>
                  <Text style={styles.barLabelText}>0 Days</Text>
                  <Text style={styles.barLabelText}>{ALLOCATIONS.annual} Days Annual</Text>
                </View>
              </AppCard>

              {/* Unpaid Leaves */}
              <AppCard style={[styles.balanceCard, { marginBottom: 30 }]}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#FFF1F2" }]}>
                    <Ionicons name="alert-circle" size={20} color="#F43F5E" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Unpaid Leaves (LOP)</Text>
                    <Text style={styles.balanceAllocText}>
                      Loss of Pay Days Taken: {balance.lop ?? balance.unpaid ?? balance.unpaidLeaves ?? 0} Days
                    </Text>
                  </View>
                  <Text style={[styles.balanceNumber, { color: "#F43F5E" }]}>
                    {balance.lop ?? balance.unpaid ?? balance.unpaidLeaves ?? 0}
                  </Text>
                </View>
              </AppCard>
            </View>
          )}
        </ScrollView>
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  balanceName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  balanceAllocText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  balanceNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  barBg: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  heroCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroCapPill: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroCapText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FEF08A",
  },
  heroMiddleSection: {
    alignItems: "center",
    marginVertical: 6,
  },
  heroAllowedCount: {
    fontSize: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 48,
  },
  heroAllowedLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#E0F2FE",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroPolicyNote: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 10,
  },
  heroMetricsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  heroMiniCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  heroMiniLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#BAE6FD",
    letterSpacing: 0.5,
  },
  heroMiniValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  heroMiniUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  carriedOverNote: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
    marginTop: 2,
  },
  remainingUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
});

export default EmployeeLeaveBalanceScreen;
