import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import {
  getCompaniesApi,
  getPlanByIdApi,
  updatePlanApi,
} from "../../api/superAdminService";

const ALL_MODULES = [
  { id: "attendance", label: "Attendance & Time Tracking", icon: "time-outline", desc: "Clock-in/out, timesheets, and geofencing limits" },
  { id: "leave", label: "Leave & Absence Management", icon: "calendar-outline", desc: "Leave policies, balance tracking, and approvals" },
  { id: "payroll", label: "Payroll Processing", icon: "cash-outline", desc: "Salary slips, tax settings, and automatic compliance" },
  { id: "tasks", label: "Task & Ticket Management", icon: "checkmark-done-circle-outline", desc: "Shared boards, assignments, and due date trackers" },
  { id: "projects", label: "Project Management", icon: "briefcase-outline", desc: "Milestones, progress bars, and budget calculations" },
  { id: "recruitment", label: "Recruitment (ATS)", icon: "people-outline", desc: "Job postings, applicant pipeline, and scheduler" },
  { id: "performance", label: "Performance & Review", icon: "bar-chart-outline", desc: "OKRs, self-evaluation, and 360 appraisals" },
  { id: "reports", label: "Analytics & Custom Reports", icon: "document-text-outline", desc: "CSV exports, interactive graphs, and charts" },
  { id: "whatsapp", label: "WhatsApp Alerts Integration", icon: "logo-whatsapp", desc: "Automated direct notifications and messaging alerts" },
];

const ModuleAccessControlScreen = ({ navigation }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [enabledModules, setEnabledModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Picker Modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getCompaniesApi();
      const list = data.companies || [];
      setCompanies(list);
      
      if (list.length > 0) {
        // Auto select first company
        handleSelectCompany(list[0]);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load companies");
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleSelectCompany = async (company) => {
    setSelectedCompany(company);
    setPickerVisible(false);
    setSearch("");
    if (!company.planId) {
      setEnabledModules([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data } = await getPlanByIdApi(company.planId);
      setEnabledModules(data.plan?.modules || []);
    } catch (err) {
      Alert.alert("Error", "Could not fetch modules configured for the company plan");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = (moduleId) => {
    if (enabledModules.includes(moduleId)) {
      setEnabledModules((prev) => prev.filter((id) => id !== moduleId));
    } else {
      setEnabledModules((prev) => [...prev, moduleId]);
    }
  };

  const handleSaveModules = async () => {
    if (!selectedCompany?.planId) {
      Alert.alert("Error", "Company has no plan associated. Add subscription plan first.");
      return;
    }
    
    setSaving(true);
    try {
      await updatePlanApi(selectedCompany.planId, {
        modules: enabledModules,
      });
      Alert.alert(
        "Success",
        `Modules for ${selectedCompany.companyName} updated successfully!`
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save module access controls");
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Companies">
      <View style={styles.container}>
        <Text style={styles.title}>Module Access Control</Text>
        
        {loading && companies.length === 0 ? (
          <Loader />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            {/* Company Selection Bar */}
            <TouchableOpacity
              style={styles.pickerSelector}
              onPress={() => setPickerVisible(true)}
            >
              <View style={styles.pickerTextContent}>
                <Text style={styles.pickerLabel}>Select Company</Text>
                <Text style={styles.pickerVal}>
                  {selectedCompany ? selectedCompany.companyName : "Select a company..."}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#4b5563" />
            </TouchableOpacity>

            {selectedCompany ? (
              <View style={styles.cardWrapper}>
                <View style={styles.planInfoBanner}>
                  <Ionicons name="shield-checkmark" size={20} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={styles.planInfoText}>
                    Active Plan: <Text style={{ fontWeight: "700" }}>{selectedCompany.planName || "Custom"}</Text>
                  </Text>
                </View>

                {loading ? (
                  <View style={styles.loaderWrapper}>
                    <Loader />
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Manage Access Permissions</Text>
                    {ALL_MODULES.map((mod) => {
                      const isEnabled = enabledModules.includes(mod.id);
                      return (
                        <TouchableOpacity
                          key={mod.id}
                          style={[styles.moduleCard, isEnabled && styles.moduleCardActive]}
                          onPress={() => handleToggleModule(mod.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.moduleRow}>
                            <View style={[styles.iconBox, isEnabled && styles.iconBoxActive]}>
                              <Ionicons
                                name={mod.icon}
                                size={22}
                                color={isEnabled ? "#2563eb" : "#4b5563"}
                              />
                            </View>
                            <View style={styles.moduleMeta}>
                              <Text style={[styles.moduleLabel, isEnabled && styles.moduleLabelActive]}>
                                {mod.label}
                              </Text>
                              <Text style={styles.moduleDesc}>{mod.desc}</Text>
                            </View>
                            <View style={[styles.checkbox, isEnabled && styles.checkboxActive]}>
                              {isEnabled && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    <AppButton
                      title="Save Access Configurations"
                      onPress={handleSaveModules}
                      loading={saving}
                      style={styles.saveBtn}
                    />
                  </>
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>Please select a company to configure modules.</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Company Picker Modal */}
        <Modal
          visible={pickerVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose a Company</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#4b5563" />
                </TouchableOpacity>
              </View>
              
              <AppInput
                placeholder="Search company..."
                value={search}
                onChangeText={setSearch}
                icon="search"
              />

              <FlatList
                data={filteredCompanies}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.companyItem,
                      selectedCompany?._id === item._id && styles.companyItemActive,
                    ]}
                    onPress={() => handleSelectCompany(item)}
                  >
                    <View style={styles.companyMeta}>
                      <Text style={styles.companyItemName}>{item.companyName}</Text>
                      <Text style={styles.companyItemPlan}>Plan: {item.planName || "Basic"}</Text>
                    </View>
                    {selectedCompany?._id === item._id && (
                      <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>No matching companies found</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  pickerSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  pickerTextContent: { flex: 1 },
  pickerLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", textTransform: "uppercase" },
  pickerVal: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginTop: 2 },
  cardWrapper: { paddingBottom: 20 },
  planInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
  },
  planInfoText: { fontSize: 14, color: "#1e40af" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#475569", marginBottom: 12, marginTop: 4 },
  loaderWrapper: { paddingVertical: 40 },
  moduleCard: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  moduleCardActive: {
    borderColor: "#2563eb",
    backgroundColor: "#f8fafc",
  },
  moduleRow: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconBoxActive: { backgroundColor: "#dbeafe" },
  moduleMeta: { flex: 1, marginRight: 8 },
  moduleLabel: { fontSize: 14, fontWeight: "700", color: "#334155" },
  moduleLabelActive: { color: "#1e293b" },
  moduleDesc: { fontSize: 11, color: "#64748b", marginTop: 2 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  saveBtn: { marginTop: 12, marginBottom: 20 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12, textAlign: "center" },
  errorText: { color: "#ef4444", padding: 16, textAlign: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  companyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  companyItemActive: { backgroundColor: "#f8fafc" },
  companyMeta: { flex: 1 },
  companyItemName: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  companyItemPlan: { fontSize: 12, color: "#64748b", marginTop: 1 },
  emptySearch: { paddingVertical: 20, alignItems: "center" },
  emptySearchText: { color: "#94a3b8", fontSize: 13 },
});

export default ModuleAccessControlScreen;
