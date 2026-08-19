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
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import {
  getSalaryStructureApi,
  createOrUpdateSalaryStructureApi,
} from "../../api/companyService";
import { getEmployeesApi } from "../../api/employeeService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const SalaryStructureScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Form Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [basicSalary, setBasicSalary] = useState("20000");
  const [hra, setHra] = useState("8000");
  const [allowances, setAllowances] = useState("4000");
  const [deductions, setDeductions] = useState("1500");
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await getEmployeesApi({ status: "active" });
      if (data && data.employees) {
        setEmployees(data.employees);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load employees");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleConfigurePress = async (employee) => {
    setSelectedEmployee(employee);
    try {
      setLoading(true);
      const { data } = await getSalaryStructureApi(employee._id);
      if (data && data.salaryStructure) {
        const ss = data.salaryStructure;
        setBasicSalary(String(ss.basicSalary ?? 20000));
        setHra(String(ss.hra ?? 8000));
        setAllowances(String(ss.allowances ?? 4000));
        setDeductions(String(ss.deductions ?? 1500));
      } else {
        setBasicSalary("20000");
        setHra("8000");
        setAllowances("4000");
        setDeductions("1500");
      }
      setModalVisible(true);
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve salary structure setup");
    } finally {
      setLoading(false);
    }
  };

  const submitForm = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      const payload = {
        basicSalary: parseInt(basicSalary) || 0,
        hra: parseInt(hra) || 0,
        allowances: parseInt(allowances) || 0,
        deductions: parseInt(deductions) || 0,
      };
      await createOrUpdateSalaryStructureApi(selectedEmployee._id, payload);
      Alert.alert("Success", "Salary structure configured successfully");
      setModalVisible(false);
      fetchEmployees();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save salary structure");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
      emp.employeeCode.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate dynamic Net Salary on the fly
  const calculatedNet = 
    (parseInt(basicSalary) || 0) + 
    (parseInt(hra) || 0) + 
    (parseInt(allowances) || 0) - 
    (parseInt(deductions) || 0);

  const renderEmployeeItem = ({ item }) => {
    const empName = `${item.firstName} ${item.lastName}`;
    const depName = item.departmentId?.name || "N/A";
    const desName = item.designationId?.name || "N/A";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.infoLeft}>
            <Text style={styles.empName}>{empName}</Text>
            <Text style={styles.empDetails}>
              {item.employeeCode} · {depName} ({desName})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleConfigurePress(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={14} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Setup</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Dashboard"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search employees by name/code..."
    >
      <View style={styles.screenHeader}>
        <Text style={styles.title}>Salary Structure Settings</Text>
        <Text style={styles.subtitle}>Configure monthly base packages for payroll processing</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching payroll profiles...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item._id}
          renderItem={renderEmployeeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchEmployees(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>No active employees found</Text>
            </View>
          }
        />
      )}

      {/* Salary Settings Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Setup Structure: {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ""}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Basic Salary *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={basicSalary}
                onChangeText={setBasicSalary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HRA (House Rent Allowance) *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={hra}
                onChangeText={setHra}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Allowances (Special, Travel, Medical) *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={allowances}
                onChangeText={setAllowances}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Deductions (Taxes, PF, Insurances) *</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={deductions}
                onChangeText={setDeductions}
              />
            </View>

            {/* Live Net Calculation Block */}
            <View style={styles.netBlock}>
              <Text style={styles.netLabel}>Estimated Net Monthly Take-Home:</Text>
              <Text style={styles.netValue}>₹{calculatedNet.toLocaleString("en-IN")}</Text>
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="outline"
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              />
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitForm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLeft: {
    flex: 1,
  },
  empName: {
    fontSize: 14.5,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  empDetails: {
    fontSize: 11.5,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    backgroundColor: "#f0fdfa",
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: ROUNDING.lg,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
    backgroundColor: "#f8fafc",
  },
  netBlock: {
    backgroundColor: "#f0fdfa",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    marginTop: 12,
    alignItems: "center",
  },
  netLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  netValue: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    color: COLORS.accentBlue,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalBtn: {
    width: 100,
    marginRight: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 120,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
});

export default SalaryStructureScreen;
