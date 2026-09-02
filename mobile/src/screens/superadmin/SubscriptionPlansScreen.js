import React, { useCallback, useState, useMemo } from "react";
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
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import AppInput from "../../components/AppInput";
import {
  getPlansApi,
  createPlanApi,
  updatePlanApi,
  updatePlanStatusApi,
  deletePlanApi,
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

const DEFAULT_PLANS = [
  {
    _id: "plan_01",
    planName: "Trial",
    planCode: "TRIAL-14",
    priceMonthly: 0,
    priceYearly: 0,
    employeeLimit: 25,
    storageLimit: 2,
    trialDays: 14,
    features: "Core HR\nBasic Attendance\n14-Day Free Access",
    modules: ["attendance", "leave", "mobileApp", "webAdmin"],
    moduleLimits: { tasks: 0, leads: 0 },
    status: "active",
  },
  {
    _id: "plan_02",
    planName: "Basic",
    planCode: "BASIC-50",
    priceMonthly: 2000,
    priceYearly: 20000,
    employeeLimit: 50,
    storageLimit: 10,
    trialDays: 0,
    features: "Attendance & Biometrics\nLeave Management\nPayroll Processing\nBasic Reports",
    modules: ["attendance", "leave", "payroll", "reports", "mobileApp", "webAdmin"],
    moduleLimits: { tasks: 0, leads: 0 },
    status: "active",
  },
  {
    _id: "plan_03",
    planName: "Pro",
    planCode: "PRO-200",
    priceMonthly: 5000,
    priceYearly: 50000,
    employeeLimit: 200,
    storageLimit: 50,
    trialDays: 0,
    features: "All Basic features\nPerformance Management\nRecruitment ATS\nWhatsApp Notifications\nLeads & CRM",
    modules: ["attendance", "leave", "payroll", "tasks", "recruitment", "performance", "reports", "whatsapp", "leads", "mobileApp", "webAdmin"],
    moduleLimits: { tasks: 50, leads: 50 },
    status: "active",
  },
  {
    _id: "plan_04",
    planName: "Enterprise",
    planCode: "ENT-UNLIM",
    priceMonthly: 15000,
    priceYearly: 150000,
    employeeLimit: 1000,
    storageLimit: 500,
    trialDays: 0,
    features: "All 12 Modules Unlocked\nDedicated Account Manager\nCustom API Access\n99.99% Uptime SLA",
    modules: ["attendance", "leave", "payroll", "tasks", "projects", "recruitment", "performance", "reports", "whatsapp", "mobileApp", "webAdmin", "leads"],
    moduleLimits: { tasks: 0, leads: 0 },
    status: "active",
  },
];

const SubscriptionPlansScreen = ({ navigation }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      const finalPlans = Array.isArray(list) && list.length > 0 ? list : DEFAULT_PLANS;
      setPlans(finalPlans);
    } catch (err) {
      console.warn("Using fallback plans on error", err);
      setPlans(DEFAULT_PLANS);
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

  // Derived filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchSearch =
        (plan.planName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.planCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof plan.features === "string" && plan.features.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "all" || plan.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  const maxSeats = useMemo(() => {
    return plans.length > 0 ? Math.max(...plans.map((p) => Number(p.employeeLimit) || 0)) : 0;
  }, [plans]);

  const activeCount = useMemo(() => {
    return plans.filter((p) => p.status === "active").length;
  }, [plans]);

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
    const feats = Array.isArray(plan.features) ? plan.features.join("\n") : (plan.features || "");
    setForm({
      planName: plan.planName || "",
      planCode: plan.planCode || "",
      priceMonthly: String(plan.priceMonthly ?? ""),
      priceYearly: String(plan.priceYearly ?? ""),
      employeeLimit: String(plan.employeeLimit ?? "50"),
      storageLimit: String(plan.storageLimit ?? "5"),
      trialDays: String(plan.trialDays ?? "0"),
      features: feats,
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
        features: typeof form.features === "string" ? form.features.split("\n").filter((f) => f.trim() !== "") : form.features,
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

  const handleDeletePlan = (id) => {
    Alert.alert(
      "Delete Plan Tier",
      "Are you sure you want to permanently delete this plan? Companies assigned to this plan must be reassigned first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePlanApi(id);
              Alert.alert("Success", "Plan tier deleted successfully");
              fetchPlans();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete plan tier");
            }
          },
        },
      ]
    );
  };

  const renderPlanCard = ({ item }) => {
    const isActive = (item.status || "active") === "active";
    const planMods = Array.isArray(item.modules) ? item.modules : [];
    const monthlyPrice = Number(item.priceMonthly) || 0;
    const yearlyPrice = Number(item.priceYearly) || 0;
    const savingsPercent = monthlyPrice > 0 && yearlyPrice > 0
      ? Math.round((1 - (yearlyPrice / (monthlyPrice * 12))) * 100)
      : 0;

    const featureList = Array.isArray(item.features)
      ? item.features
      : typeof item.features === "string"
      ? item.features.split("\n").filter(Boolean)
      : [];

    return (
      <View style={[styles.planCard, !isActive && { opacity: 0.85 }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.planHeaderLeft}>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{item.planCode || "TIER"}</Text>
            </View>
            <Text style={styles.planName}>{item.planName}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: isActive ? "rgba(245, 158, 11, 0.12)" : "rgba(100, 116, 139, 0.12)", borderColor: isActive ? "rgba(245, 158, 11, 0.3)" : "rgba(100, 116, 139, 0.2)" }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? "#F59E0B" : "#94A3B8" }]} />
            <Text style={[styles.statusText, { color: isActive ? "#F59E0B" : "#94A3B8" }]}>
              {isActive ? "Active Tier" : "Archived"}
            </Text>
          </View>
        </View>

        {/* Pricing Box */}
        <View style={styles.priceBox}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
              <Text style={styles.priceBig}>₹{monthlyPrice.toLocaleString("en-IN")}</Text>
              <Text style={styles.priceFreq}>/ month</Text>
            </View>
            <Text style={styles.priceYearlyText}>
              or <Text style={{ fontWeight: "700", color: "#F8FAFC" }}>₹{yearlyPrice.toLocaleString("en-IN")}</Text> / year
            </Text>
          </View>

          {savingsPercent > 0 && (
            <View style={styles.savingsPill}>
              <Text style={styles.savingsText}>Save {savingsPercent}%</Text>
            </View>
          )}
        </View>

        {/* 3 Quota Pillars */}
        <View style={styles.quotaGrid}>
          <View style={styles.quotaBox}>
            <Ionicons name="people" size={16} color="#F59E0B" style={{ marginBottom: 2 }} />
            <Text style={styles.quotaVal}>{item.employeeLimit || 50}</Text>
            <Text style={styles.quotaLbl}>Seats</Text>
          </View>

          <View style={styles.quotaBox}>
            <Ionicons name="cloud" size={16} color="#06B6D4" style={{ marginBottom: 2 }} />
            <Text style={styles.quotaVal}>{item.storageLimit || 5} GB</Text>
            <Text style={styles.quotaLbl}>Storage</Text>
          </View>

          <View style={styles.quotaBox}>
            <Ionicons name="time" size={16} color="#EAB308" style={{ marginBottom: 2 }} />
            <Text style={styles.quotaVal}>{item.trialDays || 0} Days</Text>
            <Text style={styles.quotaLbl}>Free Trial</Text>
          </View>
        </View>

        {/* Key Features List */}
        {featureList.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.sectionMiniTitle}>KEY VALUE FEATURES</Text>
            <View style={{ gap: 5 }}>
              {featureList.slice(0, 4).map((f, i) => (
                <View key={i} style={styles.featRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#F59E0B" style={{ marginTop: 1.5 }} />
                  <Text style={styles.featText} numberOfLines={1}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Entitled Modules Chips */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionMiniTitle}>ENTITLED SUITE MODULES ({planMods.length})</Text>
          <View style={styles.modulesWrap}>
            {planMods.map((modKey) => {
              const found = ALL_MODULES.find((m) => m.key === modKey);
              const label = found ? found.label.split(" ")[0] : modKey;
              const color = found ? found.color : "#F59E0B";
              const cap = item.moduleLimits?.[modKey];

              return (
                <View key={modKey} style={[styles.moduleBadge, { backgroundColor: color + "14", borderColor: color + "35" }]}>
                  <View style={[styles.modDot, { backgroundColor: color }]} />
                  <Text style={[styles.moduleBadgeText, { color }]}>
                    {label.toUpperCase()} {cap > 0 ? `(${cap})` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Card Actions Footer */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionConfigureBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={15} color="#F8FAFC" />
            <Text style={styles.actionConfigureText}>Configure Tier</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 6 }}>
            <TouchableOpacity
              style={[styles.iconActionBtn, { backgroundColor: isActive ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)", borderColor: isActive ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)" }]}
              onPress={() => handleTogglePlanStatus(item._id, item.status)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive ? "eye-off-outline" : "eye-outline"}
                size={16}
                color={isActive ? "#F59E0B" : "#10B981"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconActionBtn, { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.3)" }]}
              onPress={() => handleDeletePlan(item._id)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Plans">
      <StatusBar barStyle="light-content" backgroundColor="#071A2F" />

      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>SaaS Subscription Plans</Text>
            <Text style={styles.screenSubtitle}>Architect pricing tiers, resource quotas & enterprise modules</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.85}>
            <LinearGradient
              colors={["#D97706", "#F59E0B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlans(true)} colors={["#F59E0B"]} />
          }
        >
          {/* Top 4 KPI Cards Grid */}
          <View style={styles.kpiGrid}>
            <TouchableOpacity
              style={[styles.kpiCard, statusFilter === "all" && styles.kpiCardActive]}
              onPress={() => setStatusFilter("all")}
              activeOpacity={0.8}
            >
              <View style={styles.kpiLeft}>
                <Text style={styles.kpiTitle}>TOTAL TIERS</Text>
                <Text style={styles.kpiValue}>{plans.length}</Text>
                <Text style={styles.kpiSub}>All configured</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="layers" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.kpiCard, statusFilter === "active" && styles.kpiCardActive]}
              onPress={() => setStatusFilter("active")}
              activeOpacity={0.8}
            >
              <View style={styles.kpiLeft}>
                <Text style={styles.kpiTitle}>ACTIVE PLANS</Text>
                <Text style={[styles.kpiValue, { color: "#10B981" }]}>{activeCount}</Text>
                <Text style={styles.kpiSub}>Published</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: "#10B981" }]}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.kpiCard}>
              <View style={styles.kpiLeft}>
                <Text style={styles.kpiTitle}>MAX CAPACITY</Text>
                <Text style={[styles.kpiValue, { color: "#06B6D4" }]}>{maxSeats}</Text>
                <Text style={styles.kpiSub}>Seats limit</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: "#06B6D4" }]}>
                <Ionicons name="people" size={18} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiLeft}>
                <Text style={styles.kpiTitle}>SAAS MODULES</Text>
                <Text style={[styles.kpiValue, { color: "#8B5CF6" }]}>{ALL_MODULES.length}</Text>
                <Text style={styles.kpiSub}>System suites</Text>
              </View>
              <View style={[styles.kpiIconBox, { backgroundColor: "#8B5CF6" }]}>
                <Ionicons name="hardware-chip" size={18} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Search & Filter Toolbar */}
          <View style={styles.toolbarCard}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" />
              <TextInput
                placeholder="Search plans by name, code or feature..."
                placeholderTextColor="#64748B"
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { id: "all", label: "All Plans" },
                { id: "active", label: "Active Only" },
                { id: "inactive", label: "Archived" },
              ].map((pill) => {
                const isSelected = statusFilter === pill.id;
                return (
                  <TouchableOpacity
                    key={pill.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setStatusFilter(pill.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Plans List */}
          {loading && plans.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Loading subscription tiers...</Text>
            </View>
          ) : filteredPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={44} color="#64748B" />
              <Text style={styles.emptyTitle}>No Subscription Plans Found</Text>
              <Text style={styles.emptySub}>Try adjusting search or tap Add Plan to create a new tier.</Text>
            </View>
          ) : (
            filteredPlans.map((plan) => (
              <React.Fragment key={plan._id || plan.planCode}>
                {renderPlanCard({ item: plan })}
              </React.Fragment>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

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
                  <View style={styles.modalIconCircle}>
                    <Ionicons name="cube" size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>
                      {editingPlan ? `Configure: ${editingPlan.planName}` : "Create Subscription Plan"}
                    </Text>
                    <Text style={styles.modalSubtitle}>Define pricing, seat quotas, and entitled modules</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {formError ? (
                  <View style={styles.formErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.formErrorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Section 1: Core Tier Identity */}
                <Text style={styles.formSectionTitle}>1. CORE TIER IDENTITY</Text>
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

                {/* Section 2: Pricing & Resource Quotas */}
                <Text style={styles.formSectionTitle}>2. PRICING &amp; RESOURCE QUOTAS</Text>
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
                      label="Trial (Days)"
                      value={form.trialDays}
                      onChangeText={(v) => setForm((prev) => ({ ...prev, trialDays: v }))}
                      placeholder="e.g. 14"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Section 3: Feature Highlights */}
                <Text style={styles.formSectionTitle}>3. KEY VALUE FEATURES</Text>
                <AppInput
                  label="Feature Highlights (One per line)"
                  value={form.features}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, features: v }))}
                  placeholder="e.g. Core HR&#10;Biometric Attendance&#10;Lead CRM Engine&#10;99.99% Uptime SLA"
                  multiline={true}
                  numberOfLines={3}
                />

                {/* Section 4: 12 Entitled Suite Modules */}
                <View style={styles.moduleSectionHeader}>
                  <Text style={styles.formSectionTitle}>
                    4. ENTITLED SUITE MODULES ({form.modules?.length || 0}/12)
                  </Text>
                  <View style={styles.moduleQuickBtns}>
                    <TouchableOpacity onPress={handleSelectAllModules}>
                      <Text style={styles.quickActionText}>Select All</Text>
                    </TouchableOpacity>
                    <Text style={{ color: "#475569" }}>•</Text>
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
                          isSelected && { borderColor: m.color, backgroundColor: m.color + "18" },
                        ]}
                        onPress={() => handleToggleModule(m.key)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.moduleIconBox, { backgroundColor: m.color + "22" }]}>
                          <Ionicons name={m.icon} size={15} color={m.color} />
                        </View>
                        <Text style={[styles.moduleLabel, isSelected && { color: "#F8FAFC", fontWeight: "800" }]} numberOfLines={1}>
                          {m.label}
                        </Text>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={18}
                          color={isSelected ? m.color : "#64748B"}
                          style={{ marginLeft: "auto" }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Section 5: Per-Module Seat Limits */}
                <Text style={styles.formSectionTitle}>5. PER-MODULE SEAT LIMITS (0 = UNLIMITED)</Text>
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

                {/* Submit & Cancel */}
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
                      <ActivityIndicator size="small" color="#0F172A" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={17} color="#0F172A" />
                        <Text style={styles.submitBtnText}>
                          {editingPlan ? "Update Tier" : "Save Tier"}
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
    backgroundColor: "#071A2F",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 2,
  },
  addBtn: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  addBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8.5,
    gap: 5,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 16,
    gap: 12,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    width: "48.5%",
    backgroundColor: "#0F243E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiCardActive: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  kpiLeft: {
    flex: 1,
  },
  kpiTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#F8FAFC",
    marginTop: 2,
    lineHeight: 24,
  },
  kpiSub: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarCard: {
    backgroundColor: "#0F243E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    padding: 10,
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#071A2F",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#071A2F",
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  filterPillActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  filterPillTextActive: {
    color: "#F59E0B",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  errorBannerText: {
    color: "#F87171",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  emptySub: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
  },
  planCard: {
    backgroundColor: "#0F243E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planHeaderLeft: {
    flex: 1,
  },
  codePill: {
    alignSelf: "flex-start",
    backgroundColor: "#071A2F",
    borderWidth: 1,
    borderColor: "#1E3A5F",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  codeText: {
    color: "#F59E0B",
    fontSize: 9.5,
    fontFamily: "monospace",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  planName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceBox: {
    backgroundColor: "#071A2F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceBig: {
    fontSize: 22,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  priceFreq: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  priceYearlyText: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  savingsPill: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingsText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  quotaGrid: {
    flexDirection: "row",
    gap: 8,
  },
  quotaBox: {
    flex: 1,
    backgroundColor: "#071A2F",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    paddingVertical: 8,
    alignItems: "center",
  },
  quotaVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  quotaLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginTop: 1,
  },
  featuresSection: {
    borderTopWidth: 1,
    borderTopColor: "#1E3A5F",
    paddingTop: 8,
    gap: 6,
  },
  sectionMiniTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },
  featRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  featText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#E2E8F0",
    flex: 1,
  },
  modulesSection: {
    borderTopWidth: 1,
    borderTopColor: "#1E3A5F",
    paddingTop: 8,
    gap: 6,
  },
  modulesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  moduleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    gap: 4,
  },
  modDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
  },
  moduleBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: "#1E3A5F",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionConfigureBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  actionConfigureText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0F243E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#1E3A5F",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A5F",
  },
  modalHeaderTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  modalSubtitle: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  formErrorText: {
    color: "#F87171",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F59E0B",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A5F",
    paddingBottom: 4,
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
  },
  moduleQuickBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  moduleCheckCard: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#071A2F",
    borderWidth: 1,
    borderColor: "#1E3A5F",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
  },
  moduleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#94A3B8",
    flex: 1,
  },
  capGrid: {
    backgroundColor: "#071A2F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E3A5F",
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  capRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A5F",
    paddingBottom: 6,
  },
  capLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#071A2F",
    borderWidth: 1,
    borderColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "800",
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitBtnText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
});

export default SubscriptionPlansScreen;
