import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getPayslipsApi } from "../../api/payslipService";
import api from "../../api/api";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const MyPayslipsScreen = ({ navigation }) => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPayslips = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getPayslipsApi();
      if (res.data && res.data.success) {
        setPayslips(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load employee payslips list:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayslips(false);
  };

  const handleDownload = async (payId, month, year) => {
    try {
      setDownloadingId(payId);
      const filename = `payslip_${month}_${year}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const token = api.defaults.headers.common["Authorization"];
      const downloadUrl = `${api.defaults.baseURL}/payroll/${payId}/payslip-pdf`;

      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: token,
        },
      });

      if (downloadRes.status === 200) {
        Alert.alert("Success", "Payslip downloaded. Would you like to share/view it?", [
          { text: "No" },
          {
            text: "Yes, Share",
            onPress: async () => {
              await Sharing.shareAsync(downloadRes.uri);
            },
          },
        ]);
      } else {
        Alert.alert("Download Failed", "Failed to retrieve PDF file from server.");
      }
    } catch (err) {
      console.error("Download fail:", err);
      Alert.alert("Download Error", "Could not download PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Compute aggregated stats
  const totalGrossTracked = payslips.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const averageNetPayout = payslips.length > 0 ? Math.round(totalGrossTracked / payslips.length) : 48750;
  const latestPayslip = payslips.length > 0 ? payslips[0] : null;

  return (
    <EmployeeLayout navigation={navigation} title="Payroll Overview">
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1268D9"]} />}
        >
          {/* ── Oneclickorporate Blue Gradient Net Salary Hero Card ── */}
          <LinearGradient
            colors={["#082B52", "#1268D9", "#1D7DF2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.netSalaryHeroCard}
          >
            <View style={styles.heroHeaderRow}>
              <Text style={styles.heroNetLabel}>Net Salary</Text>
              <View style={styles.monthBadge}>
                <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
                <Text style={styles.monthBadgeText}>{latestPayslip ? `${latestPayslip.month} ${latestPayslip.year}` : "May 2025"}</Text>
              </View>
            </View>

            <Text style={styles.heroSalaryAmount}>
              ₹{(latestPayslip?.netSalary || averageNetPayout).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Text>

            {/* Glowing Sparkline Graphic Line */}
            <View style={styles.heroSparklineTrack}>
              <LinearGradient
                colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.4)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroSparklineBar}
              />
            </View>
          </LinearGradient>

          {/* Breakdown Preview Cards */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Earnings</Text>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Basic Salary</Text>
                <Text style={styles.breakdownVal}>₹32,000.00</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>HRA Allowance</Text>
                <Text style={styles.breakdownVal}>₹12,000.00</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Other Allowances</Text>
                <Text style={styles.breakdownVal}>₹8,750.00</Text>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Deductions</Text>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Provident Fund</Text>
                <Text style={[styles.breakdownVal, { color: "#EF4444" }]}>-₹1,500.00</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Professional Tax</Text>
                <Text style={[styles.breakdownVal, { color: "#EF4444" }]}>-₹200.00</Text>
              </View>
            </View>
          </View>

          {/* Monthly listings history */}
          <Text style={styles.sectionTitle}>Monthly Pay Slips History</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
          ) : payslips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyText}>No monthly payslips found</Text>
              <Text style={styles.emptySubtext}>Your payslips will appear here once published by HR department</Text>
            </View>
          ) : (
            payslips.map((pay) => (
              <TouchableOpacity
                key={pay._id}
                onPress={() => navigation.navigate("EmployeePayslipDetails", { payslipId: pay._id })}
                activeOpacity={0.85}
              >
                <AppCard style={styles.payslipCard}>
                  <View style={styles.payslipLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="receipt" size={20} color="#1268D9" />
                    </View>
                    <View style={styles.payslipInfo}>
                      <Text style={styles.payslipMonth}>
                        Salary Period: {pay.month} / {pay.year}
                      </Text>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusDot, pay.status === "paid" ? styles.paidDot : styles.unpaidDot]} />
                        <Text style={styles.payslipStatus}>
                          {pay.status?.toUpperCase() || "PAID"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.payslipRight}>
                    <Text style={styles.netPaidText}>₹{pay.netSalary?.toLocaleString()}</Text>
                    {downloadingId === pay._id ? (
                      <ActivityIndicator size="small" color="#1268D9" style={{ marginLeft: 10 }} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDownload(pay._id, pay.month, pay.year)}
                        style={styles.downloadBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="download-outline" size={16} color="#1268D9" />
                      </TouchableOpacity>
                    )}
                  </View>
                </AppCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  netSalaryHeroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroNetLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    opacity: 0.9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  monthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroSalaryAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginVertical: 10,
  },
  heroSparklineTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 6,
  },
  heroSparklineBar: {
    height: "100%",
    width: "75%",
    borderRadius: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  breakdownVal: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#10B981",
  },
  summaryCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    marginBottom: 20,
    borderRadius: 14,
  },
  sumItem: {
    flex: 1,
    alignItems: "center",
  },
  sumVal: {
    fontSize: 20,
    fontWeight: "850",
    color: "#2563eb",
  },
  sumLabel: {
    fontSize: 11,
    fontWeight: "650",
    color: "#64748b",
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e2e8f0",
  },
  payslipCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#ffffff",
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  payslipLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  payslipInfo: {
    flex: 1,
  },
  payslipMonth: {
    fontSize: 14,
    fontWeight: "750",
    color: "#1e293b",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  paidDot: {
    backgroundColor: "#10b981",
  },
  unpaidDot: {
    backgroundColor: "#d97706",
  },
  payslipStatus: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "600",
  },
  payslipRight: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 10,
  },
  netPaidText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginRight: 10,
  },
  downloadBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14.5,
    color: "#334155",
    fontWeight: "750",
  },
  emptySubtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default MyPayslipsScreen;
