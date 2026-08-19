import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { getPayslipDetailsApi } from "../../api/payslipService";
import api from "../../api/api";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const EmployeePayslipDetailsScreen = ({ route, navigation }) => {
  const { payslipId } = route.params || {};

  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchPayslipDetails = async () => {
    try {
      setLoading(true);
      const res = await getPayslipDetailsApi(payslipId);
      if (res.data && res.data.success) {
        setPayslip(res.data.payslip || null);
      }
    } catch (err) {
      console.error("Failed to load payslip details:", err);
      Alert.alert("Error", "Could not load payslip details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (payslipId) {
      fetchPayslipDetails();
    }
  }, [payslipId]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      // We will download the PDF via Expo FileSystem
      const filename = `payslip_${payslip.month}_${payslip.year}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const token = api.defaults.headers.common["Authorization"];
      const downloadUrl = `${api.defaults.baseURL}/payroll/${payslipId}/payslip-pdf`;

      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: token,
        },
      });

      if (downloadRes.status === 200) {
        Alert.alert("Download Completed", "Payslip downloaded successfully. Would you like to view/share it?", [
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
      console.error("Failed downloading payslip:", err);
      Alert.alert("Download Error", "Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <EmployeeLayout navigation={navigation} title="Payslip Detail" backEnabled={true}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </EmployeeLayout>
    );
  }

  if (!payslip) {
    return (
      <EmployeeLayout navigation={navigation} title="Payslip Detail" backEnabled={true}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Salary payslip details not found.</Text>
        </View>
      </EmployeeLayout>
    );
  }

  const gross = payslip.grossSalary || (payslip.earnings?.grossEarnings) || ((payslip.earnings?.basicSalary || 0) + (payslip.earnings?.hra || 0) + (payslip.earnings?.specialAllowance || 0) + (payslip.earnings?.conveyanceAllowance || 0) + (payslip.earnings?.medicalAllowance || 0) + (payslip.earnings?.otherAllowance || 0));
  const deductions = (payslip.deductions?.totalDeductions) || ((payslip.deductions?.pf || 0) + (payslip.deductions?.esi || 0) + (payslip.deductions?.tds || 0) + (payslip.deductions?.professionalTax || 0) + (payslip.deductions?.otherDeductions || 0) + (payslip.deductions?.lopDeduction || 0));

  return (
    <EmployeeLayout navigation={navigation} title="Payslip Details" backEnabled={true}>
      <View style={styles.container}>
        {/* Sub-Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Salary Slip Invoice</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top invoice header summary */}
          <AppCard style={styles.invoiceHeroCard}>
            <View style={styles.invoiceHeader}>
              <View>
                <Text style={styles.invoiceBrand}>iCoded Softwares</Text>
                <Text style={styles.invoicePeriod}>
                  Pay Period: {payslip.month} / {payslip.year}
                </Text>
              </View>
              <View style={[styles.statusBadge, payslip.status === "paid" ? styles.paidBadge : styles.unpaidBadge]}>
                <Text style={[styles.statusText, payslip.status === "paid" ? styles.paidText : styles.unpaidText]}>
                  {payslip.status?.toUpperCase() || "PENDING"}
                </Text>
              </View>
            </View>

            <View style={styles.netHighlightBlock}>
              <Text style={styles.netHighlightLabel}>NET PAYOUT SALARY</Text>
              <Text style={styles.netHighlightValue}>₹{payslip.netSalary?.toLocaleString()}</Text>
            </View>
          </AppCard>

          {/* Earnings Breakdown */}
          <Text style={styles.sectionTitle}>Earnings & Allowances</Text>
          <AppCard style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Basic Salary</Text>
              <Text style={styles.itemValueText}>₹{(payslip.earnings?.basicSalary || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>House Rent Allowance (HRA)</Text>
              <Text style={styles.itemValueText}>₹{(payslip.earnings?.hra || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Special Allowances</Text>
              <Text style={styles.itemValueText}>₹{(payslip.earnings?.specialAllowance || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Conveyance & Medical</Text>
              <Text style={styles.itemValueText}>₹{((payslip.earnings?.conveyanceAllowance || 0) + (payslip.earnings?.medicalAllowance || 0)).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Other Allowances</Text>
              <Text style={styles.itemValueText}>₹{(payslip.earnings?.otherAllowance || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.breakdownRow, { marginBottom: 0 }]}>
              <Text style={styles.itemTotalLabel}>Gross Earnings</Text>
              <Text style={styles.itemTotalValue}>₹{gross?.toLocaleString()}</Text>
            </View>
          </AppCard>

          {/* Deductions Breakdown */}
          <Text style={styles.sectionTitle}>Deductions & Taxes</Text>
          <AppCard style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Provident Fund (PF)</Text>
              <Text style={styles.itemValueText}>₹{(payslip.deductions?.pf || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Employee State Insurance (ESI)</Text>
              <Text style={styles.itemValueText}>₹{(payslip.deductions?.esi || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Tax Deducted at Source (TDS)</Text>
              <Text style={styles.itemValueText}>₹{(payslip.deductions?.tds || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Professional Tax</Text>
              <Text style={styles.itemValueText}>₹{(payslip.deductions?.professionalTax || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.itemNameText}>Loss Of Pay / Other</Text>
              <Text style={styles.itemValueText}>₹{((payslip.deductions?.lopDeduction || 0) + (payslip.deductions?.otherDeductions || 0)).toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.breakdownRow, { marginBottom: 0 }]}>
              <Text style={styles.itemTotalLabel}>Total Deductions</Text>
              <Text style={[styles.itemTotalValue, { color: "#dc2626" }]}>
                ₹{deductions?.toLocaleString()}
              </Text>
            </View>
          </AppCard>

          {/* PDF Downloader Placeholder */}
          <AppButton
            title="Download PDF Salary Slip"
            onPress={handleDownloadPdf}
            loading={downloading}
            style={styles.downloadBtn}
            icon="download-outline"
          />
        </ScrollView>
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  invoiceHeroCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  invoiceBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: -0.5,
  },
  invoicePeriod: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidBadge: {
    backgroundColor: "#ecfdf5",
  },
  unpaidBadge: {
    backgroundColor: "#fffbeb",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  paidText: {
    color: "#10b981",
  },
  unpaidText: {
    color: "#d97706",
  },
  netHighlightBlock: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  netHighlightLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.5,
  },
  netHighlightValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2563eb",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemNameText: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "600",
  },
  itemValueText: {
    fontSize: 12.5,
    fontWeight: "750",
    color: "#1e293b",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  itemTotalLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1e293b",
  },
  itemTotalValue: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#10b981",
  },
  downloadBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    marginTop: 6,
  },
});

export default EmployeePayslipDetailsScreen;
