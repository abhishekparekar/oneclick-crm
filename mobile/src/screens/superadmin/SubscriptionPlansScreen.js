import React, { useCallback, useState } from "react";
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
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import AppInput from "../../components/AppInput";
import {
  getPlansApi,
  createPlanApi,
  updatePlanApi,
  updatePlanStatusApi,
} from "../../api/superAdminService";

const ALL_MODULES = [
  { key: "attendance",  label: "Attendance & Bio-Punch", icon: "finger-print-outline", color: "#10B981" },
  { key: "leave",       label: "Leave Management",       icon: "calendar-outline",     color: "#06B6D4" },
  { key: "payroll",     label: "Payroll & Salary",       icon: "cash-outline",         color: "#8B5CF6" },
  { key: "tasks",       label: "Task Management",        icon: "checkbox-outline",     color: "#F59E0B" },
  { key: "projects",    label: "Project Workspace",      icon: "folder-open-outline",  color: "#3B82F6" },
  { key: "leads",       label: "Leads Engine & CRM",     icon: "magnet-outline",       color: "#EC4899" },
  { key: "reports",     label: "Analytics & Reports",    icon: "stats-chart-outline",  color: "#6366F1" },
  { key: "whatsapp",    label: "WhatsApp Automation",    icon: "logo-whatsapp",        color: "#25D366" },
  { key: "performance", label: "Performance Appraisal",  icon: "trending-up-outline",  color: "#F97316" },
  { key: "recruitment", label: "Recruitment & ATS",      icon: "person-add-outline",   color: "#14B8A6" },
  { key: "mobileApp",   label: "Mobile App Access",      icon: "phone-portrait-outline", color: "#0284C7" },
  { key: "webAdmin",    label: "Web Admin Console",      icon: "laptop-outline",       color: "#475569" },
];

const MODULE_CAPS = [
  { key: "tasks",      label: "Tasks Seat Cap",      color: "#F59E0B" },
  { key: "leads",      label: "Leads Seat Cap",      color: "#EC4899" },
  { key: "attendance", label: "Attendance Seat Cap", color: "#10B981" },
  { key: "leave",      label: "Leaves Seat Cap",     color: "#06B6D4" },
  { key: "payroll",    label: "Payroll Seat Cap",    color: "#8B5CF6" },
  { key: "projects",   label: "Projects Seat Cap",   color: "#3B82F6" },
  { key: "reports",    label: "Reports Seat Cap",    color: "#6366F1" },
];

const SubscriptionPlansScreen = ({ navigation }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({
    planName: "",
    planCode: "",
    priceMonthly: "",
    priceYearly: "",
    employeeLimit: "50",
    storageLimit: "5",
    trialDays: "0",
    features: "",
    modules: ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads", "mobileApp", "webAdmin"],
    moduleLimits: {
      tasks: 0,
      leads: 0,
      attendance: 0,
      leave: 0,
      payroll: 0,
      projects: 0,
      reports: 0,
    },
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
      const list = data.plans || data || [];
      setPlans(Array.isArray(list) ? list : []);
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
      employeeLimit: "50",
      storageLimit: "5",
      trialDays: "0",
      features: "",
      modules: ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads", "mobileApp", "webAdmin"],
      moduleLimits: {
        tasks: 0,
        leads: 0,
        attendance: 0,
        leave: 0,
        payroll: 0,
        projects: 0,
        reports: 0,
      },
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
      priceMonthly: String(plan.priceMonthly ?? ""),
      priceYearly: String(plan.priceYearly ?? ""),
      employeeLimit: String(plan.employeeLimit ?? "50"),
      storageLimit: String(plan.storageLimit ?? "5"),
      trialDays: String(plan.trialDays ?? "0"),
      features: plan.features || "",
      modules: Array.isArray(plan.modules) && plan.modules.length > 0
        ? plan.modules
        : ["attendance", "leave", "payroll", "tasks", "reports"],
      moduleLimits: plan.moduleLimits || {
        tasks: 0,
        leads: 0,
        attendance: 0,
        leave: 0,
        payroll: 0,
        projects: 0,
        reports: 0,
      },
      status: plan.status || "active",
    });
    setFormError("");
    setModalVisible(true);
  };

  const handleToggleModule = (modKey) => {
    setForm((prev) => {
      const current = prev.modules || [];
      const exists = current.includes(modKey);
      const next = exists ? current.filter((m) => m !== modKey) : [...current, modKey];
      return { ...prev, modules: next };
    });
  };

  const handleSelectAllModules = () => {
    setForm((prev) => ({
      ...prev,
      modules: ALL_MODULES.map((m) => m.key),
    }));
  };

  const handleClearModules = () => {
    setForm((prev) => ({
      ...prev,
      modules: [],
    }));
  };

  const handleModuleLimitChange = (key, val) => {
    const num = parseInt(val, 10) || 0;
    setForm((prev) => ({
      ...prev,
      moduleLimits: {
        ...(prev.moduleLimits || {}),
        [key]: num,
      },
    }));
  };

  const handleFormSubmit = async () => {
    if (!form.planName || !form.planCode || form.priceMonthly === "" || form.priceYearly === "" || !form.employeeLimit) {
      setFormError("Plan Name, Code, Prices, and Employee Limit are required.");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const payload = {
        ...form,
        priceMonthly: Number(form.priceMonthly) || 0,
        priceYearly: Number(form.priceYearly) || 0,
        employeeLimit: Number(form.employeeLimit) || 1,
        storageLimit: Number(form.storageLimit) || 5,
        trialDays: Number(form.trialDays) || 0,
      };

      if (editingPlan) {
        await updatePlanApi(editingPlan._id, payload);
        Alert.alert("Success", "Subscription plan updated successfully!");
      } else {
        await createPlanApi(payload);
        Alert.alert("Success", "Subscription plan created successfully!");
      }
      setModalVisible(false);
      fetchPlans();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit plan");
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
      Alert.alert("Error", err.response?.data?.message || "Failed to update plan status");
    }
  };

  const renderPlanCard = ({ item }) => {
    const isActive = (item.status || "active") === "active";
    const planMods = Array.isArray(item.modules) ? item.modules : [];

    return (
      <View style={styles.planCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.planNameBox}>
            <View style={styles.planIconWrapper}>
              <Ionicons name="card" size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.planName}>{item.planName}</Text>
              <Text style={styles.planCode}>{item.planCode}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)" }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? "#10B981" : "#EF4444" }]} />
            <Text style={[styles.statusText, { color: isActive ? "#10B981" : "#EF4444" }]}>
              {isActive ? "Active Tier" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Pricing & Quotas Row */}
        <View style={styles.pricingRow}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Monthly</Text>
            <Text style={styles.priceVal}>₹{item.priceMonthly || 0}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Yearly</Text>
            <Text style={styles.priceVal}>₹{item.priceYearly || 0}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Seats</Text>
            <Text style={styles.priceVal}>{item.employeeLimit || 50}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Storage</Text>
            <Text style={styles.priceVal}>{item.storageLimit || 5} GB</Text>
          </View>
        </View>

        {/* Features / Highlights */}
        {item.features ? (
          <Text style={styles.featuresText} numberOfLines={2}>
            {item.features}
          </Text>
        ) : null}

        {/* Modules Chips */}
        <View style={styles.modulesHeaderRow}>
          <Text style={styles.modulesHeader}>Entitled Modules ({planMods.length})</Text>
        </View>
        <View style={styles.modulesContainer}>
          {planMods.map((modKey) => {
            const found = ALL_MODULES.find((m) => m.key === modKey);
            const label = found ? found.label.split(" ")[0] : modKey;
            const color = found ? found.color : "#1268D9";
            const cap = item.moduleLimits?.[modKey];

            return (
              <View key={modKey} style={[styles.moduleTag, { borderColor: color + "40", backgroundColor: color + "10" }]}>
                <View style={[styles.modDot, { backgroundColor: color }]} />
                <Text style={[styles.moduleTagText, { color }]}>
                  {label} {cap > 0 ? `(${cap})` : ""}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color="#1268D9" />
            <Text style={styles.editBtnText}>Edit Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: isActive ? "#FEE2E2" : "#ECFDF5" }]}
            onPress={() => handleTogglePlanStatus(item._id, item.status)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isActive ? "ban-outline" : "checkmark-circle-outline"}
              size={15}
              color={isActive ? "#EF4444" : "#10B981"}
            />
            <Text style={[styles.toggleBtnText, { color: isActive ? "#EF4444" : "#10B981" }]}>
              {isActive ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Plans">
      <StatusBar barStyle="light-content" backgroundColor="#071A2F" />

      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.screenTitle}>Subscription Plans</Text>
            <Text style={styles.screenSubtitle}>Manage SaaS tiers, pricing & module access</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Plan</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {loading && plans.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1268D9" />
            <Text style={styles.loadingText}>Loading subscription plans...</Text>
          </View>
        ) : (
          <FlatList
            data={plans}
            keyExtractor={(item) => item._id || item.planCode || Math.random().toString()}
            renderItem={renderPlanCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlans(true)} colors={["#1268D9"]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="card-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Subscription Plans Found</Text>
                <Text style={styles.emptySub}>Create plans to start onboarding client companies.</Text>
              </View>
            }
          />
        )}

        {/* ── Plan Create / Edit Modal Dialog ────────────────────────────── */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <Ionicons name="card" size={20} color="#F59E0B" />
                  <Text style={styles.modalTitle}>
                    {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} p={4}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {formError ? (
                  <View style={styles.formErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.formErrorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Plan Core Identity */}
                <Text style={styles.formSectionTitle}>1. Plan Identity</Text>
                <AppInput
                  label="Plan Name *"
                  value={form.planName}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, planName: v }))}
                  placeholder="e.g. Enterprise Pro"
                />
                <AppInput
                  label="Plan Code (Unique ID) *"
                  value={form.planCode}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, planCode: v }))}
                  placeholder="e.g. ENT-PRO"
                  editable={!editingPlan}
                />

                {/* Pricing Details */}
                <Text style={styles.formSectionTitle}>2. Pricing &amp; Quota</Text>
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Monthly Price (₹) *"
                      value={form.priceMonthly}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, priceMonthly: v }))}
                      placeholder="e.g. 4999"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Yearly Price (₹) *"
                      value={form.priceYearly}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, priceYearly: v }))}
                      placeholder="e.g. 49999"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Employee Seats *"
                      value={form.employeeLimit}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, employeeLimit: v }))}
                      placeholder="e.g. 100"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Cloud Storage (GB)"
                      value={form.storageLimit}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, storageLimit: v }))}
                      placeholder="e.g. 50"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.formCol}>
                    <AppInput
                      label="Trial Days"
                      value={form.trialDays}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, trialDays: v }))}
                      placeholder="e.g. 14"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <AppInput
                  label="Feature Highlights (Optional)"
                  value={form.features}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, features: v }))}
                  placeholder="e.g. Unlimited users, Dedicated Manager, 24/7 SLA"
                />

                {/* 12 Suite Modules Entitlement */}
                <View style={styles.moduleSectionHeader}>
                  <Text style={styles.formSectionTitle}>
                    3. Entitled Suite Modules ({form.modules?.length || 0}/12)
                  </Text>
                  <View style={styles.moduleQuickBtns}>
                    <TouchableOpacity onPress={handleSelectAllModules}>
                      <Text style={styles.quickActionText}>Select All</Text>
                    </TouchableOpacity>
                    <Text style={{ color: "#CBD5E1" }}>|</Text>
                    <TouchableOpacity onPress={handleClearModules}>
                      <Text style={styles.quickActionText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.moduleGrid}>
                  {ALL_MODULES.map((m) => {
                    const isSelected = form.modules?.includes(m.key);
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.moduleCheckCard,
                          isSelected && { borderColor: m.color, backgroundColor: m.color + "0F" },
                        ]}
                        onPress={() => handleToggleModule(m.key)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.moduleIconBox, { backgroundColor: m.color + "18" }]}>
                          <Ionicons name={m.icon} size={16} color={m.color} />
                        </View>
                        <Text style={[styles.moduleLabel, isSelected && { color: "#0F172A", fontWeight: "800" }]} numberOfLines={1}>
                          {m.label}
                        </Text>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={18}
                          color={isSelected ? m.color : "#94A3B8"}
                          style={{ marginLeft: "auto" }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Per-Module Seat Limits */}
                <Text style={styles.formSectionTitle}>4. Per-Module Seat Limits (0 = Unlimited)</Text>
                <View style={styles.capGrid}>
                  {MODULE_CAPS.map((cap) => (
                    <View key={cap.key} style={styles.capRow}>
                      <Text style={styles.capLabel}>{cap.label}</Text>
                      <AppInput
                        value={String(form.moduleLimits?.[cap.key] || 0)}
                        onChangeText={(v) => handleModuleLimitChange(cap.key, v)}
                        placeholder="0"
                        keyboardType="numeric"
                        containerStyle={{ width: 80, marginBottom: 0 }}
                      />
                    </View>
                  ))}
                </View>

                {/* Submit & Cancel Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleFormSubmit}
                    disabled={formLoading}
                    activeOpacity={0.85}
                  >
                    {formLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>
                          {editingPlan ? "Update Plan" : "Save Plan"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  screenSubtitle: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1268D9",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  errorBannerText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // ── Plan Card ──────────────────────────────────────────────────────────────
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planNameBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  planIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  planName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  planCode: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
  },
  priceCol: {
    alignItems: "center",
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  priceVal: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  priceDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  featuresText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 10,
    lineHeight: 16,
  },
  modulesHeaderRow: {
    marginBottom: 6,
  },
  modulesHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  modulesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 14,
  },
  moduleTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  modDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moduleTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1268D9",
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },

  // ── Modal Styles ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  modalHeaderTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalScroll: {
    paddingTop: 4,
  },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  formErrorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 10,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  formCol: {
    flex: 1,
  },
  moduleSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  moduleQuickBtns: {
    flexDirection: "row",
    gap: 8,
  },
  quickActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1268D9",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginBottom: 14,
  },
  moduleCheckCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  moduleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  capGrid: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
    marginBottom: 16,
  },
  capRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  capLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1268D9",
    gap: 6,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export default SubscriptionPlansScreen;
