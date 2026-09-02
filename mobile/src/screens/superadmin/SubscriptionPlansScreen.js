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
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import {
  getPlansApi,
  createPlanApi,
  updatePlanApi,
  updatePlanStatusApi,
} from "../../api/superAdminService";

const AVAILABLE_MODULES = [
  "attendance",
  "leave",
  "payroll",
  "tasks",
  "projects",
  "recruitment",
  "performance",
  "reports",
  "whatsapp",
];

const SubscriptionPlansScreen = ({ navigation }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // null means adding
  const [form, setForm] = useState({
    planName: "",
    planCode: "",
    priceMonthly: "",
    priceYearly: "",
    employeeLimit: "",
    storageLimit: "5",
    modules: ["attendance", "leave", "reports"],
    status: "active",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPlans = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const { data } = await getPlansApi();
      setPlans(data.plans || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load subscription plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [])
  );

  const openAddModal = () => {
    setEditingPlan(null);
    setForm({
      planName: "",
      planCode: "",
      priceMonthly: "",
      priceYearly: "",
      employeeLimit: "",
      storageLimit: "5",
      modules: ["attendance", "leave", "reports"],
      status: "active",
    });
    setFormError("");
    setModalVisible(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setForm({
      planName: plan.planName || "",
      planCode: plan.planCode || "",
      priceMonthly: String(plan.priceMonthly || ""),
      priceYearly: String(plan.priceYearly || ""),
      employeeLimit: String(plan.employeeLimit || ""),
      storageLimit: String(plan.storageLimit || "5"),
      modules: plan.modules || [],
      status: plan.status || "active",
    });
    setFormError("");
    setModalVisible(true);
  };

  const handleToggleModule = (mod) => {
    setForm((prev) => {
      const activeMods = [...prev.modules];
      const index = activeMods.indexOf(mod);
      if (index > -1) {
        activeMods.splice(index, 1);
      } else {
        activeMods.push(mod);
      }
      return { ...prev, modules: activeMods };
    });
  };

  const handleFormSubmit = async () => {
    if (!form.planName || !form.planCode || !form.priceMonthly || !form.priceYearly || !form.employeeLimit) {
      setFormError("All fields except storage are required.");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const payload = {
        ...form,
        priceMonthly: Number(form.priceMonthly),
        priceYearly: Number(form.priceYearly),
        employeeLimit: Number(form.employeeLimit),
        storageLimit: Number(form.storageLimit) || 5,
      };

      if (editingPlan) {
        await updatePlanApi(editingPlan._id, payload);
        Alert.alert("Success", "Plan updated successfully!");
      } else {
        await createPlanApi(payload);
        Alert.alert("Success", "Plan created successfully!");
      }
      setModalVisible(false);
      fetchPlans();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit plan form");
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePlanStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updatePlanStatusApi(id, newStatus);
      Alert.alert("Success", `Plan status updated to ${newStatus}`);
      fetchPlans();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    }
  };

  const renderItem = ({ item }) => {
    return (
      <AppCard style={styles.planCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.planName}>{item.planName}</Text>
            <Text style={styles.planCode}>Code: {item.planCode}</Text>
          </View>
          <View style={[styles.badge, item.status === "active" ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.pricingRow}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Monthly</Text>
            <Text style={styles.priceVal}>₹{item.priceMonthly}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Yearly</Text>
            <Text style={styles.priceVal}>₹{item.priceYearly}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Limit</Text>
            <Text style={styles.priceVal}>{item.employeeLimit} Users</Text>
          </View>
        </View>

        <Text style={styles.modulesHeader}>Enabled SaaS Modules:</Text>
        <View style={styles.modulesContainer}>
          {item.modules?.map((m) => (
            <View key={m} style={styles.moduleTag}>
              <Text style={styles.moduleTagText}>{m}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <AppButton
            title="Edit Plan"
            onPress={() => openEditModal(item)}
            variant="outline"
            style={[styles.actionBtn, styles.flexBtn]}
          />
          <AppButton
            title={item.status === "active" ? "Deactivate" : "Activate"}
            onPress={() => handleTogglePlanStatus(item._id, item.status)}
            variant={item.status === "active" ? "outline" : "primary"}
            style={[styles.actionBtn, styles.flexBtn, { marginLeft: 8 }]}
          />
        </View>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Plans">
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.sectionTitle}>SaaS Pricing Plans</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Plan</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && plans.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={plans}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlans(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="card-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No subscription plans found. Add one!</Text>
              </View>
            }
          />
        )}

        {/* Modal Form */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <AppInput
                  label="Plan Name *"
                  value={form.planName}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, planName: v }))}
                  placeholder="e.g. Enterprise Plan"
                />
                <AppInput
                  label="Plan Code (Unique ID) *"
                  value={form.planCode}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, planCode: v }))}
                  placeholder="e.g. ENTERPRISE_PRO"
                  editable={!editingPlan}
                />
                
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Monthly Price (INR) *"
                      value={form.priceMonthly}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, priceMonthly: v }))}
                      placeholder="999"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Yearly Price (INR) *"
                      value={form.priceYearly}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, priceYearly: v }))}
                      placeholder="9999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Employee Limit *"
                      value={form.employeeLimit}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, employeeLimit: v }))}
                      placeholder="50"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Storage Limit (GB)"
                      value={form.storageLimit}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, storageLimit: v }))}
                      placeholder="5"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <AppButton
                  title={formLoading ? "Submitting..." : editingPlan ? "Update Plan" : "Create Plan"}
                  onPress={handleFormSubmit}
                  loading={formLoading}
                  style={styles.formSubmitBtn}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#f8fafc" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  listContainer: { padding: 16, paddingBottom: 40 },
  planCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 8,
  },
  planName: { fontSize: 16, fontWeight: "800", color: "#f8fafc" },
  planCode: { fontSize: 11, color: "#f59e0b", marginTop: 2, fontWeight: "700", fontFamily: "monospace" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadge: { backgroundColor: "rgba(16, 185, 129, 0.15)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" },
  inactiveBadge: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)" },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#f8fafc", textTransform: "uppercase" },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 10,
    marginBottom: 12,
  },
  priceCol: { alignItems: "center" },
  priceLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" },
  priceVal: { fontSize: 14, fontWeight: "800", color: "#f8fafc", marginTop: 2 },
  modulesHeader: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" },
  modulesContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  moduleTag: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  moduleTagText: { fontSize: 10, fontWeight: "700", color: "#f59e0b", textTransform: "uppercase" },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
    marginTop: 4,
  },
  actionBtn: { height: 36, paddingVertical: 0, justifyContent: "center" },
  flexBtn: { flex: 1 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    width: "100%",
    maxHeight: "85%",
    padding: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 10,
    marginBottom: 14,
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#f8fafc" },
  modalScroll: { flex: 1 },
  formRow: { flexDirection: "row", gap: 10 },
  formCol: { flex: 1 },
  formSubmitBtn: { marginTop: 14, marginBottom: 20, backgroundColor: "#f59e0b" },
  formError: { color: "#f87171", marginBottom: 12, textAlign: "center", fontSize: 12 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 13, color: "#94a3b8", marginTop: 12 },
  errorText: { color: "#f87171", padding: 12, textAlign: "center" },
});

export default SubscriptionPlansScreen;
