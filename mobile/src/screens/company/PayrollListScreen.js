import React, { useState, useEffect, useMemo } from "react";
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
  TextInput,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import { getApiBaseUrl } from "../../api/api";
import {
  getCompanyPayrollApi,
  previewPayrollApi,
  generatePayrollApi,
  saveSalaryStructureApi,
  markPayrollPaidApi,
  getPayslipApi,
  getCompanyEmployeesApi,
} from "../../api/companyService";

const { width } = Dimensions.get("window");

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

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const fmt = (v) => `₹ ${(Number(v) || 0).toLocaleString("en-IN")}`;
const fmtDays = (v) => {
  const n = Number(v) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
};

const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;
  if (rawPhoto.startsWith("http") || rawPhoto.startsWith("data:")) return rawPhoto;
  const baseUrl = getApiBaseUrl().replace("/api", "");
  return `${baseUrl}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`;
};

const PayrollListScreen = ({ navigation, route }) => {
  const queryClient = useQueryClient();
  const initialTab = route.params?.activeTab || "history";
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  // ── History Tab States ───────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Payslip Modal State
  const [payslipModalVisible, setPayslipModalVisible] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payslipData, setPayslipData] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [paying, setPaying] = useState(false);

  // ── Generate Wizard States (Matching Web Exactly) ──────────────────────
  const [step, setStep] = useState(1); // 1: Period, 2: Review & Adjust, 3: Success
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [showGenMonthModal, setShowGenMonthModal] = useState(false);
  const [showGenYearModal, setShowGenYearModal] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [genError, setGenError] = useState("");

  // Override Modal (Bonus / Incentive / Advance Recovery)
  const [activeOverrideEmp, setActiveOverrideEmp] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ bonus: "", incentive: "", advanceDeduction: "" });

  // Quick CTC Setup Modal
  const [quickCtcEmp, setQuickCtcEmp] = useState(null);
  const [quickCtcAmount, setQuickCtcAmount] = useState("");
  const [savingQuickCtc, setSavingQuickCtc] = useState(false);

  // Detailed Itemized Breakdown Modal
  const [selectedPreviewDetails, setSelectedPreviewDetails] = useState(null);

  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveSubTab(route.params.activeTab);
    }
  }, [route.params?.activeTab]);

  // Fetch employees to show counts in Step 1
  const { data: employeesData } = useQuery({
    queryKey: ["companyEmployeesPayroll"],
    queryFn: async () => {
      const res = await getCompanyEmployeesApi({ limit: 1000 });
      return res.data?.employees || [];
    },
    enabled: activeSubTab === "generate",
  });
  const employees = employeesData || [];

  // Fetch history payrolls
  const {
    data: payrolls = [],
    isLoading: isHistoryLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["companyPayroll", selectedMonth, selectedYear],
    queryFn: async () => {
      const params = { month: selectedMonth, year: selectedYear };
      const res = await getCompanyPayrollApi(params);
      return res.data?.payrolls || [];
    },
    enabled: activeSubTab === "history",
  });

  // ── STEP 1: Compute Preview (Exact Backend Endpoint Parity) ───────────────
  const handleCalculatePreview = async (customOverrides = null) => {
    if (previewLoading) return;
    setGenError("");
    try {
      setPreviewLoading(true);
      const activeEmpIds = employees
        .filter((e) => e.status === "active")
        .map((e) => e._id);

      if (activeEmpIds.length === 0) {
        setGenError("No active staff members found in the company.");
        Alert.alert("No Staff", "No active staff members found in the company.");
        return;
      }

      const activeOverrides = customOverrides !== null ? customOverrides : overrides;

      const res = await previewPayrollApi({
        month: genMonth,
        year: genYear,
        employeeIds: activeEmpIds,
        overrides: activeOverrides,
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setPreviews(res.data.data);
        const validIds = res.data.data
          .filter((p) => p.success)
          .map((p) => String(p.employeeId));
        setSelectedEmpIds(validIds);
        setStep(2);
      } else {
        const msg = res.data?.message || "Failed to calculate preview.";
        setGenError(msg);
        Alert.alert("Error", msg);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Could not compute payroll preview. Please try again.";
      setGenError(msg);
      Alert.alert("Calculation Error", msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── STEP 2: Generate Final Payroll (Matches Web Exact Mutation) ───────────
  const handleGenerateFinal = async () => {
    if (generating) return;
    setGenError("");
    if (selectedEmpIds.length === 0) {
      Alert.alert("Select Staff", "Please select at least one employee for payroll run.");
      return;
    }

    try {
      setGenerating(true);
      const res = await generatePayrollApi({
        month: genMonth,
        year: genYear,
        employeeIds: selectedEmpIds,
        overrides,
      });

      if (res.data?.success) {
        setSuccessMsg(
          res.data.message ||
            `Payroll successfully generated and recorded for ${selectedEmpIds.length} staff members!`
        );
        setStep(3);
        queryClient.invalidateQueries(["companyPayroll"]);
      } else {
        const msg = res.data?.message || "Failed to finalize payroll generation.";
        setGenError(msg);
        Alert.alert("Error", msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to generate payroll. Please try again.";
      setGenError(msg);
      Alert.alert("Generation Error", msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Quick CTC Save (Standard Formula Identical to Web) ───────────────────
  const handleSaveQuickCtc = async () => {
    const numericCtc = Number(quickCtcAmount);
    if (!quickCtcEmp || !numericCtc || numericCtc <= 0 || savingQuickCtc) return;

    try {
      setSavingQuickCtc(true);
      const basicSalary = Math.round(numericCtc * 0.5);
      const hra = Math.round(basicSalary * 0.4);
      const conveyanceAllowance = 1600;
      const medicalAllowance = 1250;
      const pf = Math.round(basicSalary * 0.12);
      const professionalTax = 200;
      const allocated = basicSalary + hra + conveyanceAllowance + medicalAllowance;
      const specialAllowance = Math.max(0, numericCtc - allocated);

      const payload = {
        employeeId: quickCtcEmp.employeeId,
        monthlyCTC: numericCtc,
        basicSalary,
        hra,
        conveyanceAllowance,
        medicalAllowance,
        specialAllowance,
        otherAllowance: 0,
        pf,
        esi: 0,
        professionalTax,
        tds: 0,
        otherDeductions: 0,
      };

      await saveSalaryStructureApi(payload);
      Alert.alert(
        "Saved",
        `Salary structure saved for ${quickCtcEmp.employeeSnapshot?.employeeName || "staff"}!`
      );
      setQuickCtcEmp(null);
      setQuickCtcAmount("");
      // Recalculate preview immediately using backend
      handleCalculatePreview();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save salary structure.");
    } finally {
      setSavingQuickCtc(false);
    }
  };

  // ── Save Adjustments & Recalculate Preview ────────────────────────────────
  const handleSaveOverride = () => {
    if (!activeOverrideEmp) return;
    const empId = activeOverrideEmp.employeeId;
    const b = Number(overrideForm.bonus) || 0;
    const inc = Number(overrideForm.incentive) || 0;
    const adv = Number(overrideForm.advanceDeduction) || 0;

    const newOverrides = {
      ...overrides,
      [empId]: { bonus: b, incentive: inc, advanceDeduction: adv },
    };
    setOverrides(newOverrides);
    setActiveOverrideEmp(null);

    // Call backend preview to recalculate exact numbers with statutory deductions & taxes
    handleCalculatePreview(newOverrides);
  };

  const toggleSelectAll = () => {
    const validIds = previews.filter((p) => p.success).map((p) => String(p.employeeId));
    setSelectedEmpIds(selectedEmpIds.length === validIds.length ? [] : validIds);
  };

  const toggleSelect = (id) => {
    const sid = String(id);
    setSelectedEmpIds((prev) =>
      prev.includes(sid) ? prev.filter((i) => i !== sid) : [...prev, sid]
    );
  };

  // Filtered staff list in Step 2
  const filteredPreviews = useMemo(() => {
    return previews.filter((p) => {
      const snap = p.employeeSnapshot;
      if (!snap) return true;
      const text = `${snap.employeeName || ""} ${snap.employeeCode || ""} ${snap.department || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [previews, search]);

  const validCount = previews.filter((p) => p.success).length;

  const totalGrossPayout = useMemo(() => {
    return previews
      .filter((p) => selectedEmpIds.includes(String(p.employeeId)))
      .reduce(
        (sum, p) =>
          sum +
          (p.grossSalary ||
            p.earnings?.grossEarnings ||
            p.calculatedPayroll?.grossSalary ||
            p.calculatedPayroll?.earnings?.grossEarnings ||
            0),
        0
      );
  }, [previews, selectedEmpIds]);

  const totalNetPayout = useMemo(() => {
    return previews
      .filter((p) => selectedEmpIds.includes(String(p.employeeId)))
      .reduce((sum, p) => sum + (p.netSalary || p.calculatedPayroll?.netSalary || 0), 0);
  }, [previews, selectedEmpIds]);

  // ── History Payslip & Mark Paid Handlers ──────────────────────────────────
  const handleViewPayslip = async (payroll) => {
    setSelectedPayroll(payroll);
    setPayslipModalVisible(true);
    setLoadingPayslip(true);
    try {
      const { data } = await getPayslipApi(payroll._id);
      if (data && (data.payslip || data.payroll)) {
        setPayslipData(data.payslip || data.payroll);
      }
    } catch (err) {
      Alert.alert("Notice", "Could not retrieve full payslip record.");
    } finally {
      setLoadingPayslip(false);
    }
  };

  const handleMarkPaid = async (payrollId) => {
    Alert.alert("Confirm Payment", "Mark this salary as PAID?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Paid",
        onPress: async () => {
          try {
            setPaying(true);
            await markPayrollPaidApi(payrollId);
            Alert.alert("Success", "Payroll record updated to PAID");
            setPayslipModalVisible(false);
            queryClient.invalidateQueries(["companyPayroll"]);
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to mark paid.");
          } finally {
            setPaying(false);
          }
        },
      },
    ]);
  };

  const selectedMonthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label;
  const genMonthLabel = MONTHS.find((m) => m.value === genMonth)?.label;

  return (
    <CompanyAdminLayout navigation={navigation} title="Payroll Management">
      <View style={styles.container}>
        {/* Top Tab Bar: History vs Generate */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === "history" && styles.subTabActive]}
            onPress={() => setActiveSubTab("history")}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={activeSubTab === "history" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === "history" && styles.subTabTextActive,
              ]}
            >
              Payroll History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === "generate" && styles.subTabActive]}
            onPress={() => setActiveSubTab("generate")}
          >
            <Ionicons
              name="calculator-outline"
              size={14}
              color={activeSubTab === "generate" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === "generate" && styles.subTabTextActive,
              ]}
            >
              Generate Payroll
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SUBTAB 1: PAYROLL HISTORY                                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === "history" && (
          <View style={{ flex: 1 }}>
            {/* Filter Pills Row with Quick Action */}
            <View style={styles.historyFilterRow}>
              <TouchableOpacity
                style={styles.historyPill}
                onPress={() => setShowMonthPicker(true)}
              >
                <Ionicons name="calendar-outline" size={13} color="#64748B" />
                <Text style={styles.historyPillText}>{selectedMonthLabel}</Text>
                <Ionicons name="chevron-down" size={11} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.historyPill}
                onPress={() => setShowYearPicker(true)}
              >
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.historyPillText}>{selectedYear}</Text>
                <Ionicons name="chevron-down" size={11} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickGenBtn}
                onPress={() => {
                  setGenMonth(selectedMonth);
                  setGenYear(selectedYear);
                  setActiveSubTab("generate");
                  setStep(1);
                }}
              >
                <Ionicons name="add" size={14} color="#FFF" />
                <Text style={styles.quickGenBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>

            {isHistoryLoading && !isRefetching ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0284C7" />
                <Text style={styles.loadingText}>Fetching payroll runs...</Text>
              </View>
            ) : (
              <FlatList
                data={payrolls}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
                refreshControl={
                  <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No Payroll Runs Recorded</Text>
                    <Text style={styles.emptySubtitle}>
                      No salaries have been generated yet for {selectedMonthLabel} {selectedYear}.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyActionBtn}
                      onPress={() => {
                        setGenMonth(selectedMonth);
                        setGenYear(selectedYear);
                        setActiveSubTab("generate");
                        setStep(1);
                      }}
                    >
                      <Ionicons name="add-circle" size={14} color="#FFF" />
                      <Text style={styles.emptyActionBtnText}>Run Payroll Now</Text>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item }) => {
                  const emp = item.employeeId || item.employeeSnapshot || {};
                  const empName =
                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                    emp.employeeName ||
                    "Employee";
                  const empCode = emp.employeeCode || "—";
                  const isPaid = item.status === "paid";
                  const photoUrl = getPhotoUrl(emp.photo || emp.user?.profileImage);

                  return (
                    <TouchableOpacity
                      style={styles.payrollCard}
                      onPress={() => handleViewPayslip(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardTopRow}>
                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.avatarMiniImg} />
                        ) : (
                          <View style={styles.avatarMini}>
                            <Text style={styles.avatarMiniText}>
                              {empName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.cardEmpName} numberOfLines={1}>
                            {empName}
                          </Text>
                          <Text style={styles.cardEmpCode}>
                            {empCode} • {emp.departmentId?.name || emp.department || "General"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isPaid ? styles.statusPaid : styles.statusPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isPaid ? { color: "#059669" } : { color: "#D97706" },
                            ]}
                          >
                            {isPaid ? "PAID" : "GENERATED"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardDivider} />

                      <View style={styles.cardStatsRow}>
                        <View style={styles.statCol}>
                          <Text style={styles.statLabel}>Gross</Text>
                          <Text style={styles.statVal}>{fmt(item.grossSalary)}</Text>
                        </View>
                        <View style={styles.statCol}>
                          <Text style={styles.statLabel}>Deductions</Text>
                          <Text style={[styles.statVal, { color: "#EF4444" }]}>
                            -{fmt(item.deductions?.totalDeductions || 0)}
                          </Text>
                        </View>
                        <View style={styles.statCol}>
                          <Text style={styles.statLabel}>Net Salary</Text>
                          <Text
                            style={[
                              styles.statVal,
                              { color: "#059669", fontFamily: FONTS.displayBold },
                            ]}
                          >
                            {fmt(item.netSalary)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SUBTAB 2: GENERATE PAYROLL 3-STEP WIZARD (EXACT PARITY WITH WEB)     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === "generate" && (
          <ScrollView
            contentContainerStyle={{ padding: 12, paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step Progress Indicator Matching Web */}
            <View style={styles.stepProgressRow}>
              {[
                { s: 1, label: "1. Period" },
                { s: 2, label: "2. Review & Adjust" },
                { s: 3, label: "3. Disburse" },
              ].map((item) => {
                const isActive = step === item.s;
                const isDone = step > item.s;
                return (
                  <View
                    key={item.s}
                    style={[
                      styles.stepPill,
                      isActive && styles.stepPillActive,
                      isDone && styles.stepPillDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepPillText,
                        isActive && styles.stepPillTextActive,
                        isDone && styles.stepPillTextDone,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Error Banner */}
            {genError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{genError}</Text>
              </View>
            ) : null}

            {/* ── STEP 1: CHOOSE PERIOD (EXACT MATCH) ──────────────────────── */}
            {step === 1 && (
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name="calendar" size={22} color="#D97706" />
                  </View>
                  <Text style={styles.stepTitle}>Choose Payroll Billing Cycle</Text>
                  <Text style={styles.stepSubtitle}>
                    Select the month and year to compile attendance and generate salary calculation previews.
                  </Text>
                </View>

                {/* Period Selectors */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Salary Period (Month & Year)</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowGenMonthModal(true)}
                    >
                      <Text style={styles.pickerTriggerText}>{genMonthLabel}</Text>
                      <Ionicons name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowGenYearModal(true)}
                    >
                      <Text style={styles.pickerTriggerText}>{genYear}</Text>
                      <Ionicons name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Staff Summary KPIs */}
                <View style={styles.kpiGrid2}>
                  <View style={styles.kpiMiniCard}>
                    <Text style={styles.kpiMiniLabel}>ACTIVE STAFF</Text>
                    <Text style={styles.kpiMiniVal}>
                      {employees.filter((e) => e.status === "active").length}
                    </Text>
                  </View>
                  <View style={styles.kpiMiniCard}>
                    <Text style={styles.kpiMiniLabel}>TOTAL ENROLLED</Text>
                    <Text style={styles.kpiMiniVal}>{employees.length}</Text>
                  </View>
                </View>

                {/* Preview Calculation Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    previewLoading && { opacity: 0.7 },
                  ]}
                  onPress={() => handleCalculatePreview()}
                  disabled={previewLoading}
                >
                  {previewLoading ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={styles.primaryBtnText}>
                        Computing Attendance & Proration...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Calculate & Preview Payroll</Text>
                      <Ionicons name="arrow-forward" size={15} color="#FFF" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 2: REVIEW CALCULATIONS & ADJUSTMENTS ─────────────────── */}
            {step === 2 && (
              <View style={{ gap: 10 }}>
                {/* Top KPI Deck */}
                <View style={styles.kpiGrid4}>
                  <View style={styles.kpiCardItem}>
                    <Text style={styles.kpiCardLabel}>SELECTED</Text>
                    <Text style={styles.kpiCardVal}>
                      {selectedEmpIds.length} / {previews.length}
                    </Text>
                  </View>
                  <View style={styles.kpiCardItem}>
                    <Text style={styles.kpiCardLabel}>GROSS</Text>
                    <Text style={[styles.kpiCardVal, { color: "#059669" }]}>
                      {fmt(totalGrossPayout)}
                    </Text>
                  </View>
                  <View style={styles.kpiCardItem}>
                    <Text style={styles.kpiCardLabel}>NET DISBURSAL</Text>
                    <Text style={[styles.kpiCardVal, { color: "#D97706" }]}>
                      {fmt(totalNetPayout)}
                    </Text>
                  </View>
                  <View style={styles.kpiCardItem}>
                    <Text style={styles.kpiCardLabel}>READY</Text>
                    <Text style={[styles.kpiCardVal, { color: "#10B981" }]}>
                      {validCount} Valid
                    </Text>
                  </View>
                </View>

                {/* Toolbar: Select All, Search, Change Period */}
                <View style={styles.reviewToolbar}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                    onPress={toggleSelectAll}
                  >
                    <Ionicons
                      name={
                        selectedEmpIds.length === validCount && validCount > 0
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={18}
                      color="#0284C7"
                    />
                    <Text style={styles.toolbarSelectText}>
                      Select All Valid ({selectedEmpIds.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.changePeriodBtn}
                    onPress={() => setStep(1)}
                  >
                    <Text style={styles.changePeriodText}>Change Period</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={14} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search staff, code, department..."
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Staff Preview Cards */}
                {filteredPreviews.map((p, idx) => {
                  const empName = p.employeeSnapshot?.employeeName || "Employee";
                  const empCode = p.employeeSnapshot?.employeeCode || "—";
                  const dept = p.employeeSnapshot?.department || "General";
                  const isSelected = selectedEmpIds.includes(String(p.employeeId));
                  const empOverrides = overrides[p.employeeId] || {};
                  const hasOverrides =
                    empOverrides.bonus || empOverrides.incentive || empOverrides.advanceDeduction;
                  const att = p.attendanceSummary || p.calculatedPayroll?.attendanceDetails || {};
                  const monthLeavesCount =
                    att.monthLeaves ?? ((att.paidLeaveDays || 0) + (att.unpaidLeaveDays || 0));
                  const gross =
                    p.grossSalary ||
                    p.earnings?.grossEarnings ||
                    p.calculatedPayroll?.grossSalary ||
                    p.calculatedPayroll?.earnings?.grossEarnings ||
                    0;
                  const deductions =
                    p.deductions?.totalDeductions ||
                    p.calculatedPayroll?.deductions?.totalDeductions ||
                    0;
                  const net = p.netSalary || p.calculatedPayroll?.netSalary || 0;

                  const empObj = employees.find((e) => String(e._id) === String(p.employeeId));
                  const rawPhoto =
                    p.employeeSnapshot?.photo ||
                    p.photo ||
                    empObj?.photo ||
                    empObj?.user?.profileImage ||
                    null;
                  const photoUrl = getPhotoUrl(rawPhoto);

                  return (
                    <TouchableOpacity
                      key={`${p.employeeId || idx}`}
                      style={[
                        styles.previewCard,
                        isSelected && styles.previewCardSelected,
                        !p.success && styles.previewCardError,
                      ]}
                      activeOpacity={0.9}
                      onPress={() => setSelectedPreviewDetails(p)}
                    >
                      <View style={styles.cardTopRow}>
                        {p.success ? (
                          <TouchableOpacity
                            onPress={() => toggleSelect(p.employeeId)}
                            style={{ marginRight: 6 }}
                          >
                            <Ionicons
                              name={isSelected ? "checkbox" : "square-outline"}
                              size={18}
                              color="#0284C7"
                            />
                          </TouchableOpacity>
                        ) : (
                          <Ionicons
                            name="alert-circle"
                            size={18}
                            color="#EF4444"
                            style={{ marginRight: 6 }}
                          />
                        )}

                        {photoUrl ? (
                          <Image source={{ uri: photoUrl }} style={styles.avatarMiniImg} />
                        ) : (
                          <View style={styles.avatarMini}>
                            <Text style={styles.avatarMiniText}>
                              {empName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}

                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.cardEmpName} numberOfLines={1}>
                            {empName}
                          </Text>
                          <Text style={styles.cardEmpCode}>
                            {empCode} • {dept}
                          </Text>
                        </View>

                        {p.success ? (
                          <View style={styles.readyBadge}>
                            <Ionicons name="checkmark" size={11} color="#059669" />
                            <Text style={styles.readyBadgeText}>Ready</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.missingCtcBtn}
                            onPress={() => {
                              setQuickCtcEmp(p);
                              setQuickCtcAmount("");
                            }}
                          >
                            <Feather name="sparkles" size={11} color="#D97706" style={{ marginRight: 3 }} />
                            <Text style={styles.missingCtcText}>Set CTC</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {p.success ? (
                        <>
                          <View style={styles.previewDivider} />
                          {/* Attendance & Salary Metrics */}
                          <View style={styles.metricsRow}>
                            <View style={styles.metricCol}>
                              <Text style={styles.metricLabel}>PAYABLE DAYS</Text>
                              <Text style={styles.metricVal}>
                                {fmtDays(att.payableDays || 0)} Days
                              </Text>
                              <Text style={styles.metricSub}>
                                {fmtDays(att.presentDays || 0)}P · {fmtDays(att.absentDays || 0)}A
                                {att.halfDays > 0 ? ` · ${fmtDays(att.halfDays)}HD` : ""}
                              </Text>
                            </View>

                            <View style={styles.metricCol}>
                              <Text style={styles.metricLabel}>LEAVES</Text>
                              <View
                                style={[
                                  styles.leaveTag,
                                  monthLeavesCount > 0 ? styles.leaveTagActive : styles.leaveTagZero,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.leaveTagText,
                                    monthLeavesCount > 0
                                      ? { color: "#D97706" }
                                      : { color: "#94A3B8" },
                                  ]}
                                >
                                  {fmtDays(monthLeavesCount)} L
                                </Text>
                              </View>
                            </View>

                            <View style={styles.metricCol}>
                              <Text style={styles.metricLabel}>GROSS</Text>
                              <Text style={[styles.metricVal, { color: "#059669" }]}>
                                {fmt(gross)}
                              </Text>
                            </View>

                            <View style={styles.metricCol}>
                              <Text style={styles.metricLabel}>DEDUCTIONS</Text>
                              <Text style={[styles.metricVal, { color: "#EF4444" }]}>
                                -{fmt(deductions)}
                              </Text>
                            </View>

                            <View style={styles.metricCol}>
                              <Text style={styles.metricLabel}>NET SALARY</Text>
                              <Text
                                style={[
                                  styles.metricVal,
                                  { color: "#0F172A", fontFamily: FONTS.displayBold },
                                ]}
                              >
                                {fmt(net)}
                              </Text>
                            </View>
                          </View>

                          {/* Overrides button & indicator */}
                          <View style={styles.overrideRow}>
                            <TouchableOpacity
                              style={[
                                styles.overrideBtn,
                                hasOverrides && styles.overrideBtnActive,
                              ]}
                              onPress={() => {
                                setActiveOverrideEmp(p);
                                setOverrideForm({
                                  bonus: empOverrides.bonus ? String(empOverrides.bonus) : "",
                                  incentive: empOverrides.incentive
                                    ? String(empOverrides.incentive)
                                    : "",
                                  advanceDeduction:
                                    empOverrides.advanceDeduction !== undefined
                                      ? String(empOverrides.advanceDeduction)
                                      : p.deductions?.advanceDeduction
                                      ? String(p.deductions.advanceDeduction)
                                      : "",
                                });
                              }}
                            >
                              <Feather
                                name="gift"
                                size={12}
                                color={hasOverrides ? "#D97706" : "#0284C7"}
                              />
                              <Text
                                style={[
                                  styles.overrideBtnText,
                                  hasOverrides && { color: "#D97706" },
                                ]}
                              >
                                {hasOverrides ? "Adjusted" : "+ Adjust"}
                              </Text>
                            </TouchableOpacity>

                            {hasOverrides ? (
                              <View style={styles.overrideTag}>
                                <Text style={styles.overrideTagText}>
                                  {empOverrides.bonus ? `+${fmt(empOverrides.bonus)} Bonus ` : ""}
                                  {empOverrides.incentive
                                    ? `+${fmt(empOverrides.incentive)} Inc `
                                    : ""}
                                  {empOverrides.advanceDeduction
                                    ? `-${fmt(empOverrides.advanceDeduction)} Adv`
                                    : ""}
                                </Text>
                              </View>
                            ) : null}

                            <TouchableOpacity
                              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                              onPress={() => setSelectedPreviewDetails(p)}
                            >
                              <Text style={styles.viewDetailsText}>Breakdown</Text>
                              <Ionicons name="chevron-forward" size={12} color="#64748B" />
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <View style={styles.errorNotice}>
                          <Text style={styles.errorNoticeText}>
                            {p.message || "Salary structure missing for this staff."}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Bottom Finalize Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { marginTop: 10, backgroundColor: "#0F172A" },
                    (generating || selectedEmpIds.length === 0) && { opacity: 0.6 },
                  ]}
                  onPress={handleGenerateFinal}
                  disabled={generating || selectedEmpIds.length === 0}
                >
                  {generating ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color="#FFF" size="small" />
                      <Text style={styles.primaryBtnText}>
                        Generating Payroll Records...
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.primaryBtnText}>
                        Generate Final Payroll ({selectedEmpIds.length} Staff)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP 3: DISBURSE / SUCCESS CONFIRMATION ──────────────────── */}
            {step === 3 && (
              <View style={styles.successCard}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-done" size={34} color="#10B981" />
                </View>
                <Text style={styles.successHeading}>Payroll Successfully Generated!</Text>
                <Text style={styles.successSubtext}>
                  {successMsg ||
                    "Salaries and payslip statements have been recorded and released for the selected billing period."}
                </Text>

                <View style={styles.successSummaryBox}>
                  <View style={styles.successSummaryRow}>
                    <Text style={styles.successSummaryLabel}>Billing Cycle</Text>
                    <Text style={styles.successSummaryVal}>
                      {genMonthLabel} {genYear}
                    </Text>
                  </View>
                  <View style={styles.successSummaryRow}>
                    <Text style={styles.successSummaryLabel}>Total Processed</Text>
                    <Text style={styles.successSummaryVal}>
                      {selectedEmpIds.length} Employees
                    </Text>
                  </View>
                  <View style={[styles.successSummaryRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.successSummaryLabel}>Net Total Disbursal</Text>
                    <Text
                      style={[
                        styles.successSummaryVal,
                        { color: "#059669", fontFamily: FONTS.displayBold },
                      ]}
                    >
                      {fmt(totalNetPayout)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: "#0284C7" }]}
                  onPress={() => {
                    setSelectedMonth(genMonth);
                    setSelectedYear(genYear);
                    setActiveSubTab("history");
                    setStep(1);
                  }}
                >
                  <Text style={styles.primaryBtnText}>View Payroll History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginTop: 8 }]}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.secondaryBtnText}>Run Another</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MODAL: QUICK CTC SETUP (EXACT WEB PARITY) ────────────────────── */}
        <Modal visible={!!quickCtcEmp} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogSheet}>
              <View style={styles.dialogHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="sparkles" size={16} color="#D97706" />
                  <Text style={[styles.dialogTitle, { color: "#D97706" }]}>
                    Set Monthly CTC
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setQuickCtcEmp(null)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.dialogStaffCard}>
                {getPhotoUrl(quickCtcEmp?.employeeSnapshot?.photo) ? (
                  <Image
                    source={{ uri: getPhotoUrl(quickCtcEmp?.employeeSnapshot?.photo) }}
                    style={styles.avatarMiniImg}
                  />
                ) : (
                  <View style={[styles.avatarMini, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.avatarMiniText, { color: "#D97706" }]}>
                      {(quickCtcEmp?.employeeSnapshot?.employeeName || "E").charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.cardEmpName}>
                    {quickCtcEmp?.employeeSnapshot?.employeeName || "Employee"}
                  </Text>
                  <Text style={styles.cardEmpCode}>
                    {quickCtcEmp?.employeeSnapshot?.employeeCode} •{" "}
                    {quickCtcEmp?.employeeSnapshot?.department || "General"}
                  </Text>
                </View>
              </View>

              <Text style={styles.dialogSubtitle}>
                Set monthly salary CTC amount. Standard breakdown (Basic 50%, HRA 40%, PF 12%,
                PT, Special Allowance) will be auto-calculated.
              </Text>

              <Text style={styles.inputFieldLabel}>Monthly CTC Amount (₹) *</Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                placeholder="e.g. 25000"
                value={quickCtcAmount}
                onChangeText={setQuickCtcAmount}
              />

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: "#D97706" },
                  (!quickCtcAmount || savingQuickCtc) && { opacity: 0.6 },
                ]}
                onPress={handleSaveQuickCtc}
                disabled={!quickCtcAmount || savingQuickCtc}
              >
                {savingQuickCtc ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Salary & Recalculate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: BONUS / ADVANCE ADJUSTMENTS (EXACT WEB PARITY) ─────────── */}
        <Modal visible={!!activeOverrideEmp} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogSheet}>
              <View style={styles.dialogHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="gift" size={16} color="#D97706" />
                  <Text style={[styles.dialogTitle, { color: "#D97706" }]}>
                    Adjust Bonus & Advances
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveOverrideEmp(null)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.dialogStaffCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardEmpName}>
                    {activeOverrideEmp?.employeeSnapshot?.employeeName || "Employee"}
                  </Text>
                  <Text style={styles.cardEmpCode}>
                    {activeOverrideEmp?.employeeSnapshot?.employeeCode} •{" "}
                    {activeOverrideEmp?.employeeSnapshot?.department || "General"}
                  </Text>
                </View>
              </View>

              {/* Auto Advance Scheduled Banner */}
              {(activeOverrideEmp?.deductions?.advanceRecoveryDetails?.length > 0 ||
                activeOverrideEmp?.deductions?.advanceDeduction > 0) && (
                <View style={styles.advanceBanner}>
                  <Feather name="credit-card" size={13} color="#D97706" />
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.advanceBannerTitle}>
                      Auto Advance Scheduled: {fmt(activeOverrideEmp.deductions?.advanceDeduction || 0)}
                    </Text>
                    <Text style={styles.advanceBannerSub}>
                      {activeOverrideEmp.deductions?.advanceRecoveryDetails?.[0]?.repaymentType ===
                      "percentage_of_salary"
                        ? "Percentage of Salary Deduction"
                        : activeOverrideEmp.deductions?.advanceRecoveryDetails?.[0]?.repaymentType ===
                          "fixed_monthly_amount"
                        ? "Fixed Monthly EMI"
                        : "Payroll Recovery"}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.inputFieldLabel}>One-Time Bonus (₹)</Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                placeholder="0"
                value={overrideForm.bonus}
                onChangeText={(v) => setOverrideForm((p) => ({ ...p, bonus: v }))}
              />

              <Text style={styles.inputFieldLabel}>Performance Incentive (₹)</Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                placeholder="0"
                value={overrideForm.incentive}
                onChangeText={(v) => setOverrideForm((p) => ({ ...p, incentive: v }))}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.inputFieldLabel}>Advance / Loan Recovery (₹)</Text>
                {activeOverrideEmp?.advanceSummary?.autoCalculatedDeduction > 0 && (
                  <Text style={{ fontSize: 10, color: "#059669", fontFamily: FONTS.bodyBold }}>
                    Auto: {fmt(activeOverrideEmp.advanceSummary.autoCalculatedDeduction)}
                  </Text>
                )}
              </View>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                placeholder={
                  activeOverrideEmp?.advanceSummary?.autoCalculatedDeduction
                    ? String(activeOverrideEmp.advanceSummary.autoCalculatedDeduction)
                    : "0"
                }
                value={overrideForm.advanceDeduction}
                onChangeText={(v) => setOverrideForm((p) => ({ ...p, advanceDeduction: v }))}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#D97706" }]}
                onPress={handleSaveOverride}
              >
                <Text style={styles.primaryBtnText}>Save & Recalculate Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: ITEMIZED PAYROLL BREAKDOWN (FULL DETAILS) ─────────────── */}
        <Modal visible={!!selectedPreviewDetails} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={[styles.dialogSheet, { maxHeight: "90%" }]}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Payroll Preview Details</Text>
                <TouchableOpacity onPress={() => setSelectedPreviewDetails(null)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedPreviewDetails && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Staff Info */}
                  <View style={styles.dialogStaffCard}>
                    {getPhotoUrl(selectedPreviewDetails.employeeSnapshot?.photo) ? (
                      <Image
                        source={{
                          uri: getPhotoUrl(selectedPreviewDetails.employeeSnapshot?.photo),
                        }}
                        style={styles.avatarMiniImg}
                      />
                    ) : (
                      <View style={styles.avatarMini}>
                        <Text style={styles.avatarMiniText}>
                          {(selectedPreviewDetails.employeeSnapshot?.employeeName || "E").charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.cardEmpName}>
                        {selectedPreviewDetails.employeeSnapshot?.employeeName || "Employee"}
                      </Text>
                      <Text style={styles.cardEmpCode}>
                        {selectedPreviewDetails.employeeSnapshot?.employeeCode} •{" "}
                        {selectedPreviewDetails.employeeSnapshot?.department} •{" "}
                        {selectedPreviewDetails.employeeSnapshot?.designation || "Staff"}
                      </Text>
                    </View>
                  </View>

                  {/* Summary Strip */}
                  <View style={styles.breakdownSummaryBox}>
                    <View style={styles.breakdownSummaryItem}>
                      <Text style={styles.breakdownSummaryLabel}>GROSS</Text>
                      <Text style={[styles.breakdownSummaryVal, { color: "#059669" }]}>
                        {fmt(selectedPreviewDetails.grossSalary || selectedPreviewDetails.earnings?.grossEarnings || 0)}
                      </Text>
                    </View>
                    <View style={styles.breakdownSummaryItem}>
                      <Text style={styles.breakdownSummaryLabel}>DEDUCTIONS</Text>
                      <Text style={[styles.breakdownSummaryVal, { color: "#EF4444" }]}>
                        -{fmt(selectedPreviewDetails.deductions?.totalDeductions || 0)}
                      </Text>
                    </View>
                    <View style={styles.breakdownSummaryItem}>
                      <Text style={styles.breakdownSummaryLabel}>NET SALARY</Text>
                      <Text style={[styles.breakdownSummaryVal, { color: "#0284C7" }]}>
                        {fmt(selectedPreviewDetails.netSalary || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Attendance Section */}
                  <Text style={styles.sectionHeading}>Attendance Summary</Text>
                  <View style={styles.tableBox}>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Total Cycle Days</Text>
                      <Text style={styles.tableVal}>
                        {selectedPreviewDetails.attendanceSummary?.totalDays || "30"}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Present Days</Text>
                      <Text style={[styles.tableVal, { color: "#059669" }]}>
                        {fmtDays(selectedPreviewDetails.attendanceSummary?.presentDays || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Absent Days</Text>
                      <Text style={[styles.tableVal, { color: "#EF4444" }]}>
                        {fmtDays(selectedPreviewDetails.attendanceSummary?.absentDays || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Half Days</Text>
                      <Text style={styles.tableVal}>
                        {fmtDays(selectedPreviewDetails.attendanceSummary?.halfDays || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Month Leaves</Text>
                      <Text style={styles.tableVal}>
                        {fmtDays(
                          selectedPreviewDetails.attendanceSummary?.monthLeaves ??
                            ((selectedPreviewDetails.attendanceSummary?.paidLeaveDays || 0) +
                              (selectedPreviewDetails.attendanceSummary?.unpaidLeaveDays || 0))
                        )}
                      </Text>
                    </View>
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.tableLabel, { fontFamily: FONTS.bodyBold }]}>
                        Payable Days
                      </Text>
                      <Text
                        style={[
                          styles.tableVal,
                          { fontFamily: FONTS.displayBold, color: "#0F172A" },
                        ]}
                      >
                        {fmtDays(selectedPreviewDetails.attendanceSummary?.payableDays || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Earnings Section */}
                  <Text style={styles.sectionHeading}>Earnings Breakdown</Text>
                  <View style={styles.tableBox}>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Basic Salary</Text>
                      <Text style={styles.tableVal}>
                        {fmt(selectedPreviewDetails.earnings?.basicSalary || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>House Rent Allowance (HRA)</Text>
                      <Text style={styles.tableVal}>
                        {fmt(selectedPreviewDetails.earnings?.hra || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Conveyance Allowance</Text>
                      <Text style={styles.tableVal}>
                        {fmt(selectedPreviewDetails.earnings?.conveyanceAllowance || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Medical Allowance</Text>
                      <Text style={styles.tableVal}>
                        {fmt(selectedPreviewDetails.earnings?.medicalAllowance || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Special Allowance</Text>
                      <Text style={styles.tableVal}>
                        {fmt(selectedPreviewDetails.earnings?.specialAllowance || 0)}
                      </Text>
                    </View>
                    {selectedPreviewDetails.earnings?.overtimePay > 0 && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Overtime Pay</Text>
                        <Text style={[styles.tableVal, { color: "#059669" }]}>
                          +{fmt(selectedPreviewDetails.earnings.overtimePay)}
                        </Text>
                      </View>
                    )}
                    {selectedPreviewDetails.earnings?.bonus > 0 && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>One-Time Bonus</Text>
                        <Text style={[styles.tableVal, { color: "#059669" }]}>
                          +{fmt(selectedPreviewDetails.earnings.bonus)}
                        </Text>
                      </View>
                    )}
                    {selectedPreviewDetails.earnings?.incentive > 0 && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Performance Incentive</Text>
                        <Text style={[styles.tableVal, { color: "#059669" }]}>
                          +{fmt(selectedPreviewDetails.earnings.incentive)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.tableLabel, { fontFamily: FONTS.bodyBold }]}>
                        Total Gross Earnings
                      </Text>
                      <Text
                        style={[
                          styles.tableVal,
                          { fontFamily: FONTS.displayBold, color: "#059669" },
                        ]}
                      >
                        {fmt(selectedPreviewDetails.grossSalary || selectedPreviewDetails.earnings?.grossEarnings || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Deductions Section */}
                  <Text style={styles.sectionHeading}>Deductions Breakdown</Text>
                  <View style={styles.tableBox}>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Provident Fund (PF)</Text>
                      <Text style={[styles.tableVal, { color: "#EF4444" }]}>
                        -{fmt(selectedPreviewDetails.deductions?.pf || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>ESI</Text>
                      <Text style={[styles.tableVal, { color: "#EF4444" }]}>
                        -{fmt(selectedPreviewDetails.deductions?.esi || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Professional Tax (PT)</Text>
                      <Text style={[styles.tableVal, { color: "#EF4444" }]}>
                        -{fmt(selectedPreviewDetails.deductions?.professionalTax || 0)}
                      </Text>
                    </View>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>TDS / Income Tax</Text>
                      <Text style={[styles.tableVal, { color: "#EF4444" }]}>
                        -{fmt(selectedPreviewDetails.deductions?.tds || 0)}
                      </Text>
                    </View>
                    {selectedPreviewDetails.deductions?.advanceDeduction > 0 && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Advance Recovery / Loan</Text>
                        <Text style={[styles.tableVal, { color: "#EF4444" }]}>
                          -{fmt(selectedPreviewDetails.deductions.advanceDeduction)}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.tableLabel, { fontFamily: FONTS.bodyBold }]}>
                        Total Deductions
                      </Text>
                      <Text
                        style={[
                          styles.tableVal,
                          { fontFamily: FONTS.displayBold, color: "#EF4444" },
                        ]}
                      >
                        -{fmt(selectedPreviewDetails.deductions?.totalDeductions || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Net Calculation */}
                  <View style={styles.netTakeHomeBox}>
                    <Text style={styles.netTakeHomeLabel}>NET PAYABLE SALARY</Text>
                    <Text style={styles.netTakeHomeVal}>
                      {fmt(selectedPreviewDetails.netSalary || 0)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 14 }]}
                    onPress={() => setSelectedPreviewDetails(null)}
                  >
                    <Text style={styles.primaryBtnText}>Close Details</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ── MODALS: MONTH & YEAR PICKERS ─────────────────────────────────── */}
        <Modal visible={showMonthPicker || showGenMonthModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowMonthPicker(false);
              setShowGenMonthModal(false);
            }}
          >
            <View style={styles.pickerModalBox}>
              <Text style={styles.pickerModalHeading}>Select Month</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={styles.pickerOptionItem}
                    onPress={() => {
                      if (showGenMonthModal) setGenMonth(m.value);
                      else setSelectedMonth(m.value);
                      setShowMonthPicker(false);
                      setShowGenMonthModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionLabel,
                        (showGenMonthModal ? genMonth === m.value : selectedMonth === m.value) && {
                          color: "#0284C7",
                          fontFamily: FONTS.bodyBold,
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showYearPicker || showGenYearModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowYearPicker(false);
              setShowGenYearModal(false);
            }}
          >
            <View style={styles.pickerModalBox}>
              <Text style={styles.pickerModalHeading}>Select Year</Text>
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={styles.pickerOptionItem}
                  onPress={() => {
                    if (showGenYearModal) setGenYear(y);
                    else setSelectedYear(y);
                    setShowYearPicker(false);
                    setShowGenYearModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionLabel,
                      (showGenYearModal ? genYear === y : selectedYear === y) && {
                        color: "#0284C7",
                        fontFamily: FONTS.bodyBold,
                      },
                    ]}
                  >
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── MODAL: PAYSLIP DETAILS (HISTORY) ─────────────────────────────── */}
        <Modal visible={payslipModalVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={[styles.dialogSheet, { maxHeight: "85%" }]}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Payslip Details</Text>
                <TouchableOpacity onPress={() => setPayslipModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {loadingPayslip ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#0284C7" />
                </View>
              ) : selectedPayroll ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ paddingVertical: 8 }}>
                    <Text style={{ fontSize: 14, fontFamily: FONTS.displayBold, color: "#0F172A" }}>
                      {selectedPayroll.employeeSnapshot?.employeeName || "Employee"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      {selectedPayroll.employeeSnapshot?.employeeCode} •{" "}
                      {selectedPayroll.employeeSnapshot?.department}
                    </Text>
                  </View>

                  <View style={styles.payslipTable}>
                    <View style={styles.payslipRow}>
                      <Text style={styles.payslipLabel}>Billing Cycle</Text>
                      <Text style={styles.payslipVal}>
                        {selectedMonthLabel} {selectedYear}
                      </Text>
                    </View>
                    <View style={styles.payslipRow}>
                      <Text style={styles.payslipLabel}>Payable Days</Text>
                      <Text style={styles.payslipVal}>
                        {selectedPayroll.attendanceSummary?.payableDays ||
                          selectedPayroll.payableDays ||
                          "—"}
                      </Text>
                    </View>
                    <View style={styles.payslipRow}>
                      <Text style={styles.payslipLabel}>Gross Earnings</Text>
                      <Text style={styles.payslipVal}>{fmt(selectedPayroll.grossSalary)}</Text>
                    </View>
                    <View style={styles.payslipRow}>
                      <Text style={styles.payslipLabel}>Total Deductions</Text>
                      <Text style={[styles.payslipVal, { color: "#EF4444" }]}>
                        -{fmt(selectedPayroll.deductions?.totalDeductions || 0)}
                      </Text>
                    </View>
                    <View style={[styles.payslipRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.payslipLabel, { fontFamily: FONTS.bodyBold }]}>
                        Net Salary
                      </Text>
                      <Text
                        style={[
                          styles.payslipVal,
                          {
                            color: "#059669",
                            fontFamily: FONTS.displayBold,
                            fontSize: 14,
                          },
                        ]}
                      >
                        {fmt(selectedPayroll.netSalary)}
                      </Text>
                    </View>
                  </View>

                  {selectedPayroll.status !== "paid" && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: "#059669", marginTop: 14 }]}
                      onPress={() => handleMarkPaid(selectedPayroll._id)}
                      disabled={paying}
                    >
                      {paying ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Mark as PAID</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 5,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: "#0F172A",
  },
  subTabText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  subTabTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
  historyFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignItems: "center",
  },
  historyPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyPillText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#1E293B",
  },
  quickGenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  quickGenBtnText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    fontFamily: FONTS.body,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D97706",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  payrollCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  avatarMiniText: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#0284C7",
  },
  cardEmpName: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  cardEmpCode: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: "#ECFDF5",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 9,
  },
  cardStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontFamily: FONTS.bodyMedium,
    textTransform: "uppercase",
  },
  statVal: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
    marginTop: 2,
  },
  stepProgressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  stepPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5.5,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  stepPillDone: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  stepPillText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  stepPillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  stepPillTextDone: {
    color: "#059669",
    fontFamily: FONTS.bodyBold,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 11.5,
    color: "#DC2626",
    fontFamily: FONTS.bodyMedium,
    flex: 1,
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepHeader: {
    alignItems: "center",
    marginBottom: 14,
  },
  stepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  stepSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 280,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  pickerTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerTriggerText: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
  },
  kpiGrid2: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiMiniCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiMiniLabel: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontFamily: FONTS.bodyBold,
  },
  kpiMiniVal: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 2,
  },
  kpiGrid4: {
    flexDirection: "row",
    gap: 6,
  },
  kpiCardItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiCardLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#94A3B8",
  },
  kpiCardVal: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 2,
  },
  reviewToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toolbarSelectText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
  },
  changePeriodBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  changePeriodText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: "#0F172A",
    height: 36,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewCardSelected: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFDF5",
  },
  previewCardError: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF5F5",
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  readyBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#059669",
  },
  missingCtcBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  missingCtcText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#D97706",
  },
  previewDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricCol: {
    flex: 1,
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 8.5,
    color: "#94A3B8",
    fontFamily: FONTS.bodyBold,
  },
  metricVal: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
    marginTop: 1,
  },
  metricSub: {
    fontSize: 8.5,
    color: "#94A3B8",
    marginTop: 1,
  },
  leaveTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 1,
  },
  leaveTagActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  leaveTagZero: {
    backgroundColor: "#F1F5F9",
  },
  leaveTagText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
  },
  overrideRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  overrideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  overrideBtnActive: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
  },
  overrideBtnText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#0284C7",
  },
  overrideTag: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overrideTagText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0369A1",
  },
  viewDetailsText: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: FONTS.bodyMedium,
  },
  errorNotice: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
  },
  errorNoticeText: {
    fontSize: 10.5,
    color: "#DC2626",
    fontFamily: FONTS.body,
  },
  primaryBtn: {
    backgroundColor: "#D97706",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successHeading: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  successSubtext: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 17,
  },
  successSummaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  successSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  successSummaryLabel: {
    fontSize: 11.5,
    color: "#64748B",
    fontFamily: FONTS.body,
  },
  successSummaryVal: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialogSheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dialogTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  dialogStaffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  advanceBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 10,
  },
  advanceBannerTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#D97706",
  },
  advanceBannerSub: {
    fontSize: 9.5,
    color: "#B45309",
    marginTop: 1,
  },
  dialogSubtitle: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
    marginBottom: 10,
  },
  inputFieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    marginBottom: 4,
    marginTop: 4,
  },
  dialogInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: "#0F172A",
    marginBottom: 8,
  },
  breakdownSummaryBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  breakdownSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  breakdownSummaryLabel: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: "#94A3B8",
  },
  breakdownSummaryVal: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableLabel: {
    fontSize: 11,
    color: "#475569",
    fontFamily: FONTS.body,
  },
  tableVal: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
  },
  netTakeHomeBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    alignItems: "center",
    marginTop: 6,
  },
  netTakeHomeLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#059669",
    letterSpacing: 0.5,
  },
  netTakeHomeVal: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: "#047857",
    marginTop: 2,
  },
  pickerModalBox: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
  },
  pickerModalHeading: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    marginBottom: 8,
  },
  pickerOptionItem: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pickerOptionLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: "#334155",
  },
  payslipTable: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 10,
  },
  payslipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  payslipLabel: {
    fontSize: 11.5,
    color: "#64748B",
    fontFamily: FONTS.body,
  },
  payslipVal: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
  },
});

export default PayrollListScreen;
