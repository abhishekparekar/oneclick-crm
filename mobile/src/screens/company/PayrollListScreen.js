import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import {
  getCompanyPayrollApi,
  generatePayrollApi,
  markPayrollPaidApi,
  getPayslipApi,
} from "../../api/companyService";

const MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const YEARS = [2024, 2025, 2026, 2027];

const PayrollListScreen = ({ navigation, route }) => {
  const queryClient = useQueryClient();
  const initialTab = route.params?.activeTab || "history"; // "history" or "generate"
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Dropdown UI filters
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Generate State
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [showGenMonthPicker, setShowGenMonthPicker] = useState(false);
  const [showGenYearPicker, setShowGenYearPicker] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Payslip / Details Modal State
  const [payslipModalVisible, setPayslipModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payslipData, setPayslipData] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveSubTab(route.params.activeTab);
    }
  }, [route.params?.activeTab]);

  const { data: payrolls = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['companyPayroll', selectedMonth, selectedYear],
    queryFn: async () => {
      const params = {
        month: selectedMonth,
        year: selectedYear,
      };
      const { data } = await getCompanyPayrollApi(params);
      return data?.payrolls || [];
    },
    enabled: activeSubTab === "history",
  });

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      const payload = {
        month: genMonth,
        year: genYear,
      };
      const { data } = await generatePayrollApi(payload);
      Alert.alert(
        "Success",
        `Payroll run initialized! Total Processed: ${data?.processedCount || 0} employees.`,
        [
          {
            text: "View History",
            onPress: () => {
              setSelectedMonth(genMonth);
              setSelectedYear(genYear);
              setActiveSubTab("history");
            },
          },
          { text: "Dismiss" },
        ]
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to generate payroll run");
    } finally {
      setGenerating(false);
    }
  };

  const handleViewPayslip = async (payroll) => {
    setSelectedPayroll(payroll);
    setPayslipModalVisible(true);
    setLoadingPayslip(true);
    try {
      const { data } = await getPayslipApi(payroll._id);
      if (data && data.payslip) {
        setPayslipData(data.payslip);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve complete payslip details");
    } finally {
      setLoadingPayslip(false);
    }
  };

  const handleMarkPaid = async (payrollId) => {
    Alert.alert(
      "Confirm Action",
      "Are you sure you want to mark this salary payment as PAID?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          style: "default",
          onPress: async () => {
            try {
              setPaying(true);
              await markPayrollPaidApi(payrollId);
              Alert.alert("Success", "Payroll record updated to PAID status");
              
              // Update selected modal view or refresh lists
              if (selectedPayroll && selectedPayroll._id === payrollId) {
                setSelectedPayroll((prev) => ({ ...prev, status: "paid" }));
              }
              setPayslipModalVisible(false);
              queryClient.invalidateQueries(['companyPayroll']);
              queryClient.invalidateQueries(['companyDashboard']);
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to mark paid");
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return { bg: "#dcfce7", text: "#15803d" };
      case "unpaid":
      default:
        return { bg: "#fee2e2", text: "#b91c1c" };
    }
  };

  const renderPayrollItem = ({ item }) => {
    const statusInfo = getStatusStyle(item.status);
    const empName = item.employeeId
      ? `${item.employeeId.firstName} ${item.employeeId.lastName}`
      : "Unknown Employee";
    const empCode = item.employeeId?.employeeCode || "N/A";

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.infoLeft}>
            <Text style={styles.empName}>{empName}</Text>
            <Text style={styles.empDetails}>Code: {empCode}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.breakdownGrid}>
          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Gross Pay</Text>
            <Text style={styles.gridVal}>₹{(item.basicSalary + item.hra + item.allowances).toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Deductions</Text>
            <Text style={[styles.gridVal, { color: "#dc2626" }]}>₹{item.deductions.toLocaleString("en-IN")}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.gridLabel}>Net Take-Home</Text>
            <Text style={[styles.gridVal, { color: "#2563eb", fontWeight: "800" }]}>
              ₹{item.netSalary.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => handleViewPayslip(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={15} color="#2563eb" />
            <Text style={styles.detailsBtnText}>View Payslip</Text>
          </TouchableOpacity>

          {item.status === "unpaid" && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => handleMarkPaid(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#15803d" />
              <Text style={styles.payBtnText}>Mark Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Dashboard"
      showSearch={false}
    >
      {/* Header Tabs */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === "history" && styles.tabBtnActive]}
          onPress={() => setActiveSubTab("history")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeSubTab === "history" && styles.tabBtnTextActive]}>
            Payroll History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === "generate" && styles.tabBtnActive]}
          onPress={() => setActiveSubTab("generate")}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabBtnText, activeSubTab === "generate" && styles.tabBtnTextActive]}>
            Generate Run
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === "history" ? (
        <View style={{ flex: 1 }}>
          {/* History Filters Section */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowMonthPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerTriggerText}>
                Month: {MONTHS.find((m) => m.value === selectedMonth)?.label}
              </Text>
              <Ionicons name="chevron-down-outline" size={14} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowYearPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerTriggerText}>Year: {selectedYear}</Text>
              <Ionicons name="chevron-down-outline" size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Month Picker Modal */}
          <Modal visible={showMonthPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalBgDim}
              activeOpacity={1}
              onPress={() => setShowMonthPicker(false)}
            >
              <View style={styles.pickerModalContent}>
                <Text style={styles.modalSubheading}>Select Month</Text>
                <FlatList
                  data={MONTHS}
                  keyExtractor={(item) => String(item.value)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        item.value === selectedMonth && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedMonth(item.value);
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          item.value === selectedMonth && styles.pickerOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Year Picker Modal */}
          <Modal visible={showYearPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalBgDim}
              activeOpacity={1}
              onPress={() => setShowYearPicker(false)}
            >
              <View style={styles.pickerModalContent}>
                <Text style={styles.modalSubheading}>Select Year</Text>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.pickerOption, y === selectedYear && styles.pickerOptionActive]}
                    onPress={() => {
                      setSelectedYear(y);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        y === selectedYear && styles.pickerOptionTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Fetching payroll details...</Text>
            </View>
          ) : (
            <FlatList
              data={payrolls}
              keyExtractor={(item) => item._id}
              renderItem={renderPayrollItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="receipt-outline" size={64} color="#94a3b8" />
                  <Text style={styles.emptyText}>No payroll runs found for selected month</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        /* Generate Tab UI */
        <ScrollView contentContainerStyle={styles.generateContainer}>
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
            <Text style={styles.infoBannerText}>
              Generating payroll will automatically capture the configured salary structure, cross-check leave/absent limits, and record generated payslips for the selected month.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Initialize Monthly Payroll Run</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Month</Text>
              <TouchableOpacity
                style={styles.formPickerTrigger}
                onPress={() => setShowGenMonthPicker(true)}
              >
                <Text style={styles.formPickerText}>
                  {MONTHS.find((m) => m.value === genMonth)?.label}
                </Text>
                <Ionicons name="chevron-down-outline" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Year</Text>
              <TouchableOpacity
                style={styles.formPickerTrigger}
                onPress={() => setShowGenYearPicker(true)}
              >
                <Text style={styles.formPickerText}>{genYear}</Text>
                <Ionicons name="chevron-down-outline" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <AppButton
              title={generating ? "Processing..." : "Generate Monthly Run"}
              loading={generating}
              style={styles.submitBtnFull}
              onPress={handleGeneratePayroll}
            />
          </View>

          {/* Month Picker Form Modal */}
          <Modal visible={showGenMonthPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalBgDim}
              activeOpacity={1}
              onPress={() => setShowGenMonthPicker(false)}
            >
              <View style={styles.pickerModalContent}>
                <Text style={styles.modalSubheading}>Select target Month</Text>
                <FlatList
                  data={MONTHS}
                  keyExtractor={(item) => String(item.value)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        item.value === genMonth && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        setGenMonth(item.value);
                        setShowGenMonthPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          item.value === genMonth && styles.pickerOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Year Picker Form Modal */}
          <Modal visible={showGenYearPicker} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalBgDim}
              activeOpacity={1}
              onPress={() => setShowGenYearPicker(false)}
            >
              <View style={styles.pickerModalContent}>
                <Text style={styles.modalSubheading}>Select target Year</Text>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.pickerOption, y === genYear && styles.pickerOptionActive]}
                    onPress={() => {
                      setGenYear(y);
                      setShowGenYearPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        y === genYear && styles.pickerOptionTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        </ScrollView>
      )}

      {/* Payslip Details Modal */}
      <Modal visible={payslipModalVisible} transparent animationType="slide">
        <View style={styles.modalBgDim}>
          <View style={styles.payslipModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employee Salary Slip</Text>
              <TouchableOpacity onPress={() => setPayslipModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loadingPayslip ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.modalLoadingText}>Compiling breakdown...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.payslipContent}>
                <View style={styles.slipHeader}>
                  <Text style={styles.slipOrg}>{payslipData?.companyName || "iCoded Softwares Pvt Ltd"}</Text>
                  <Text style={styles.slipSub}>
                    Salary Slip for {MONTHS.find((m) => m.value === selectedPayroll?.month)?.label} {selectedPayroll?.year}
                  </Text>
                </View>

                <View style={styles.slipInfoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Employee Name:</Text>
                    <Text style={styles.infoVal}>
                      {payslipData?.employeeName ||
                        (selectedPayroll?.employeeId
                          ? `${selectedPayroll.employeeId.firstName} ${selectedPayroll.employeeId.lastName}`
                          : "N/A")}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Employee Code:</Text>
                    <Text style={styles.infoVal}>
                      {payslipData?.employeeCode || selectedPayroll?.employeeId?.employeeCode || "N/A"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.slipSecTitle}>ATTENDANCE & PERFORMANCE FACTORS</Text>
                <View style={styles.slipTable}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Paid Days</Text>
                    <Text style={styles.tableColVal}>{selectedPayroll?.paidDays !== undefined ? `${selectedPayroll.paidDays} / ${selectedPayroll.totalDays}` : "30 / 30"}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Attendance Rate</Text>
                    <Text style={styles.tableColVal}>{selectedPayroll?.attendanceRate !== undefined ? `${selectedPayroll.attendanceRate.toFixed(1)}%` : "100.0%"}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Attendance Deduction</Text>
                    <Text style={[styles.tableColVal, { color: "#dc2626" }]}>-₹{(selectedPayroll?.attendanceDeduction || 0).toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Performance Score</Text>
                    <Text style={[styles.tableColVal, { color: "#2563eb" }]}>{selectedPayroll?.performanceScore !== undefined ? `${selectedPayroll.performanceScore.toFixed(1)}%` : "100.0%"}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Performance Bonus</Text>
                    <Text style={[styles.tableColVal, { color: "#16a34a" }]}>+₹{(selectedPayroll?.performanceBonus || 0).toLocaleString("en-IN")}</Text>
                  </View>
                </View>

                <Text style={styles.slipSecTitle}>EARNINGS</Text>
                <View style={styles.slipTable}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Basic + HRA</Text>
                    <Text style={styles.tableColVal}>₹{(selectedPayroll?.basicSalary || 0).toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Special Allowances</Text>
                    <Text style={styles.tableColVal}>₹{(selectedPayroll?.allowances || 0).toLocaleString("en-IN")}</Text>
                  </View>
                  {selectedPayroll?.performanceBonus > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableColLabel}>Performance Bonus</Text>
                      <Text style={[styles.tableColVal, { color: "#16a34a" }]}>+₹{(selectedPayroll?.performanceBonus || 0).toLocaleString("en-IN")}</Text>
                    </View>
                  )}
                  <View style={[styles.tableRow, styles.tableTotalRow]}>
                    <Text style={styles.tableColLabelTotal}>Total Earnings (Gross)</Text>
                    <Text style={styles.tableColValTotal}>
                      ₹{((selectedPayroll?.basicSalary || 0) + (selectedPayroll?.allowances || 0) + (selectedPayroll?.performanceBonus || 0)).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                <Text style={styles.slipSecTitle}>DEDUCTIONS & RECOVERIES</Text>
                <View style={styles.slipTable}>
                  {selectedPayroll?.attendanceDeduction > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableColLabel}>Attendance Deduction</Text>
                      <Text style={[styles.tableColVal, { color: "#dc2626" }]}>
                        -₹{(selectedPayroll?.attendanceDeduction || 0).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  )}
                  <View style={styles.tableRow}>
                    <Text style={styles.tableColLabel}>Other Deductions (PF/Tax)</Text>
                    <Text style={[styles.tableColVal, { color: "#dc2626" }]}>
                      ₹{(selectedPayroll?.deductions || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={[styles.tableRow, styles.tableTotalRow]}>
                    <Text style={styles.tableColLabelTotal}>Total Deductions</Text>
                    <Text style={[styles.tableColValTotal, { color: "#dc2626" }]}>
                      ₹{((selectedPayroll?.deductions || 0) + (selectedPayroll?.attendanceDeduction || 0)).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                <View style={styles.netSlipBox}>
                  <Text style={styles.netSlipLabel}>NET PAYABLE (ROUNDED)</Text>
                  <Text style={styles.netSlipVal}>₹{(selectedPayroll?.netSalary || 0).toLocaleString("en-IN")}</Text>
                </View>

                <View style={styles.slipActions}>
                  {selectedPayroll?.status === "unpaid" && (
                    <TouchableOpacity
                      style={styles.markPaidFullBtn}
                      onPress={() => handleMarkPaid(selectedPayroll?._id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                      <Text style={styles.markPaidFullBtnText}>Mark As PAID</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 13.5,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text.muted,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
  },
  filterBar: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    width: "48%",
    justifyContent: "space-between",
  },
  pickerTriggerText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.dark,
  },
  modalBgDim: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    width: "80%",
    maxHeight: "60%",
    ...SHADOWS.lg,
  },
  modalSubheading: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
    marginBottom: 12,
    textAlign: "center",
  },
  pickerOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  pickerOptionActive: {
    backgroundColor: "#f0fdfa",
  },
  pickerOptionText: {
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
  },
  pickerOptionTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLeft: {
    flex: 1,
  },
  empName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  empDetails: {
    fontSize: 12,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  breakdownGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridCol: {
    width: "30%",
  },
  gridLabel: {
    fontSize: 10.5,
    color: COLORS.text.light,
    fontFamily: FONTS.bodyBold,
  },
  gridVal: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    backgroundColor: "#f0fdfa",
    marginRight: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
    marginLeft: 4,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  payBtnText: {
    fontSize: 12,
    color: COLORS.success,
    fontFamily: FONTS.bodyBold,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.muted,
    marginBottom: 6,
  },
  formPickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  formPickerText: {
    fontSize: 14,
    color: COLORS.text.dark,
    fontFamily: FONTS.bodyMedium,
  },
  submitBtnFull: {
    marginTop: 8,
  },
  payslipModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.xl,
    width: "100%",
    maxHeight: "90%",
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  modalLoading: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  payslipContent: {
    paddingVertical: 16,
  },
  slipHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  slipOrg: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  slipSub: {
    fontSize: 12.5,
    color: COLORS.text.muted,
    marginTop: 2,
    fontFamily: FONTS.bodyMedium,
  },
  slipInfoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyBold,
  },
  infoVal: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.dark,
  },
  slipSecTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.light,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  slipTable: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: COLORS.white,
  },
  tableTotalRow: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0,
  },
  tableColLabel: {
    fontSize: 12.5,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
  },
  tableColVal: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.dark,
  },
  tableColLabelTotal: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.dark,
  },
  tableColValTotal: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.dark,
  },
  netSlipBox: {
    backgroundColor: "#f0fdfa",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    alignItems: "center",
    marginBottom: 20,
  },
  netSlipLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  netSlipVal: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
    color: COLORS.accentBlue,
    marginTop: 4,
  },
  slipActions: {
    alignItems: "center",
  },
  markPaidFullBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  markPaidFullBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    marginLeft: 8,
  },
});

export default PayrollListScreen;
