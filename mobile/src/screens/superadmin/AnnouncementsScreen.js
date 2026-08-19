import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppCard from "../../components/AppCard";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import {
  getAnnouncementsApi,
  createAnnouncementApi,
  getCompaniesApi,
} from "../../api/superAdminService";

const TARGET_TYPES = [
  { label: "All Companies", value: "allCompanies" },
  { label: "Specific Company", value: "selectedCompany" },
  { label: "Role Based", value: "roleBased" },
];

const ROLES_LIST = [
  { label: "Company Admins", value: "CompanyAdmin" },
  { label: "HR Managers", value: "HR" },
  { label: "Department Managers", value: "Manager" },
  { label: "Team Members", value: "Team Member" },
];

const AnnouncementsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Create Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    targetType: "allCompanies",
    targetCompanies: [],
    targetRoles: [],
    publishStatus: "published",
  });

  // Target Company picker state
  const [companyPickerVisible, setCompanyPickerVisible] = useState(false);

  const fetchAnnouncements = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      
      const { data } = await getAnnouncementsApi();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCompaniesList = async () => {
    try {
      const { data } = await getCompaniesApi();
      setCompanies(data.companies || []);
    } catch (err) {
      console.log("Error loading companies list:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
      fetchCompaniesList();
    }, [])
  );

  const openCreateModal = () => {
    setForm({
      title: "",
      message: "",
      targetType: "allCompanies",
      targetCompanies: [],
      targetRoles: [],
      publishStatus: "published",
    });
    setModalVisible(true);
  };

  const handleToggleRole = (role) => {
    if (form.targetRoles.includes(role)) {
      setForm((p) => ({ ...p, targetRoles: p.targetRoles.filter((r) => r !== role) }));
    } else {
      setForm((p) => ({ ...p, targetRoles: [...p.targetRoles, role] }));
    }
  };

  const handleToggleCompany = (companyId) => {
    if (form.targetCompanies.includes(companyId)) {
      setForm((p) => ({ ...p, targetCompanies: p.targetCompanies.filter((id) => id !== companyId) }));
    } else {
      setForm((p) => ({ ...p, targetCompanies: [...p.targetCompanies, companyId] }));
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }
    if (!form.message.trim()) {
      Alert.alert("Validation Error", "Message body is required");
      return;
    }
    if (form.targetType === "selectedCompany" && form.targetCompanies.length === 0) {
      Alert.alert("Validation Error", "Please select at least one company");
      return;
    }
    if (form.targetType === "roleBased" && form.targetRoles.length === 0) {
      Alert.alert("Validation Error", "Please select at least one role");
      return;
    }

    setFormLoading(true);
    try {
      await createAnnouncementApi(form);
      Alert.alert("Success", "Announcement created successfully!");
      setModalVisible(false);
      fetchAnnouncements();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to publish announcement");
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getTargetLabel = (item) => {
    switch (item.targetType) {
      case "allCompanies":
        return "All Companies";
      case "selectedCompany":
        return "Targeted Companies";
      case "roleBased":
        return `Target Roles (${item.targetRoles?.join(", ") || ""})`;
      default:
        return "General";
    }
  };

  const renderItem = ({ item }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>{getTargetLabel(item)}</Text>
        </View>
        <View style={[styles.statusBadge, item.publishStatus === "published" ? styles.publishedBg : styles.draftBg]}>
          <Text style={styles.statusBadgeText}>{item.publishStatus}</Text>
        </View>
      </View>
      
      <Text style={styles.announceTitle}>{item.title}</Text>
      <Text style={styles.announceMsg}>{item.message}</Text>
      
      <View style={styles.footerRow}>
        <View style={styles.authorArea}>
          <Ionicons name="create-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.footerText}>By: {item.createdBy?.name || "Admin"}</Text>
        </View>
        <Text style={styles.footerText}>{formatDate(item.createdAt)}</Text>
      </View>
    </AppCard>
  );

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>System Announcements</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && announcements.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchAnnouncements(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="megaphone-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No announcements posted yet.</Text>
              </View>
            }
          />
        )}

        {/* Floating Add Button */}
        <TouchableOpacity style={[styles.fab, { bottom: Math.max(20, insets.bottom + 20) }]} onPress={openCreateModal}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Create Form Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Publish System Announcement</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <AppInput
                  label="Announcement Title"
                  placeholder="E.g. System Maintenance Schedule"
                  value={form.title}
                  onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                />

                <AppInput
                  label="Message Content"
                  placeholder="Enter detailed notice message..."
                  value={form.message}
                  onChangeText={(v) => setForm((p) => ({ ...p, message: v }))}
                  multiline={true}
                  numberOfLines={4}
                  style={styles.textArea}
                />

                <Text style={styles.formLabel}>Target Audience:</Text>
                <View style={styles.tabsRow}>
                  {TARGET_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.tabBtn, form.targetType === t.value && styles.tabBtnActive]}
                      onPress={() => setForm((p) => ({ ...p, targetType: t.value }))}
                    >
                      <Text style={[styles.tabBtnText, form.targetType === t.value && styles.tabBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Specific Company Selection */}
                {form.targetType === "selectedCompany" && (
                  <View style={styles.sectionMargin}>
                    <TouchableOpacity
                      style={styles.companySelectorTrigger}
                      onPress={() => setCompanyPickerVisible(true)}
                    >
                      <Text style={styles.selectorLabel}>Select Targeted Companies</Text>
                      <View style={styles.triggerInner}>
                        <Text style={styles.triggerVal}>
                          {form.targetCompanies.length > 0
                            ? `${form.targetCompanies.length} companies selected`
                            : "Click to select companies"}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#64748b" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Role Specific Selectors */}
                {form.targetType === "roleBased" && (
                  <View style={styles.sectionMargin}>
                    <Text style={styles.subFormLabel}>Choose Target User Roles:</Text>
                    <View style={styles.checkboxList}>
                      {ROLES_LIST.map((role) => {
                        const isChecked = form.targetRoles.includes(role.value);
                        return (
                          <TouchableOpacity
                            key={role.value}
                            style={styles.checkboxRow}
                            onPress={() => handleToggleRole(role.value)}
                          >
                            <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                              {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={styles.checkboxLabel}>{role.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Publish Status Toggle */}
                <Text style={styles.formLabel}>Publishing Mode:</Text>
                <View style={styles.tabsRow}>
                  {[
                    { label: "Publish Now", value: "published" },
                    { label: "Save as Draft", value: "draft" },
                  ].map((mode) => (
                    <TouchableOpacity
                      key={mode.value}
                      style={[styles.tabBtn, form.publishStatus === mode.value && styles.tabBtnActive]}
                      onPress={() => setForm((p) => ({ ...p, publishStatus: mode.value }))}
                    >
                      <Text style={[styles.tabBtnText, form.publishStatus === mode.value && styles.tabBtnTextActive]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <AppButton
                  title={form.publishStatus === "published" ? "Publish Announcement" : "Save Draft"}
                  onPress={handlePublish}
                  loading={formLoading}
                  style={styles.submitBtn}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Target Companies Multi-select Modal */}
        <Modal
          visible={companyPickerVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setCompanyPickerVisible(false)}
        >
          <View style={styles.pickerBg}>
            <View style={styles.pickerContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Target Companies</Text>
                <TouchableOpacity onPress={() => setCompanyPickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#4b5563" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={companies}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isChecked = form.targetCompanies.includes(item._id);
                  return (
                    <TouchableOpacity
                      style={styles.companyRow}
                      onPress={() => handleToggleCompany(item._id)}
                    >
                      <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={styles.companyRowName}>{item.companyName}</Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={{ color: "#94a3b8" }}>No companies found</Text>
                  </View>
                }
              />
              
              <AppButton
                title="Done"
                onPress={() => setCompanyPickerVisible(false)}
                style={{ marginTop: 12 }}
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
  listContainer: { padding: 16, paddingBottom: 80 },
  card: { marginBottom: 14, padding: 14, borderRadius: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8 },
  targetBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: "#eff6ff" },
  targetBadgeText: { fontSize: 10, fontWeight: "600", color: "#2563eb", textTransform: "capitalize" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  publishedBg: { backgroundColor: "#dcfce7" },
  draftBg: { backgroundColor: "#f1f5f9" },
  statusBadgeText: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", color: "#1e293b" },
  announceTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  announceMsg: { fontSize: 12, color: "#475569", lineHeight: 18, marginBottom: 12 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 8 },
  authorArea: { flexDirection: "row", alignItems: "center" },
  footerText: { fontSize: 11, color: "#94a3b8" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
  fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563eb", alignItems: "center", justifyBox: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 16, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 10, marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  modalScroll: { flex: 1 },
  textArea: { height: 80, textAlignVertical: "top" },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginTop: 12, marginBottom: 8 },
  tabsRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  tabBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  tabBtnText: { fontSize: 12, color: "#475569" },
  tabBtnTextActive: { color: "#fff", fontWeight: "600" },
  sectionMargin: { marginVertical: 10 },
  subFormLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 6 },
  checkboxList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginRight: 10, marginVertical: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center", marginRight: 8 },
  checkboxActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  checkboxLabel: { fontSize: 13, color: "#334155" },
  companySelectorTrigger: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  selectorLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  triggerInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  triggerVal: { fontSize: 13, color: "#334155", fontWeight: "500" },
  submitBtn: { marginTop: 18, marginBottom: 20 },
  pickerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 30 },
  pickerContent: { backgroundColor: "#fff", borderRadius: 12, padding: 16, maxHeight: "80%" },
  companyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  companyRowName: { fontSize: 14, color: "#1e293b", marginLeft: 10 },
});

export default AnnouncementsScreen;
