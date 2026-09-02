import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import AppCard from "../../components/AppCard";
import Loader from "../../components/Loader";
import {
  createCompanyApi,
  getCompanyByIdApi,
  updateCompanyApi,
  getPlansApi,
} from "../../api/superAdminService";

const MODULES = [
  "attendance", "leave", "payroll", "tasks", "projects",
  "recruitment", "performance", "reports", "whatsapp", "mobileApp", "webAdmin", "leads"
];

const MODULE_CAP_ITEMS = [
  { key: "attendance", label: "Attendance & Bio-Punch", color: "#10b981" },
  { key: "leave",      label: "Leave Management",       color: "#06B6D4" },
  { key: "payroll",    label: "Payroll & Salary",       color: "#8b5cf6" },
  { key: "tasks",      label: "Tasks Module",            color: "#f59e0b" },
  { key: "leads",      label: "Leads Engine & CRM",      color: "#f59e0b" },
  { key: "projects",   label: "Projects Workspace",      color: "#06B6D4" },
  { key: "reports",    label: "Analytics & Reports",     color: "#3B82F6" },
];

const AddCompanyScreen = ({ route, navigation }) => {
  const companyId = route.params?.companyId;
  const isEdit = !!companyId;

  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    industryType: "Technology",
    planId: "",
    planName: "Basic",
    employeeLimit: "50",
    storageLimit: "5",
    trialDays: "7",
    subscribedModules: [
      "attendance", "leave", "payroll", "tasks", "projects", "reports", "mobileApp", "webAdmin", "leads"
    ],
    moduleLimits: {
      attendance: 0,
      leave: 0,
      payroll: 0,
      tasks: 0,
      leads: 0,
      projects: 0,
      reports: 0,
    },
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
  });

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPlans();
    if (isEdit) {
      loadCompanyDetails();
    }
  }, [companyId]);

  const loadPlans = async () => {
    try {
      const { data } = await getPlansApi();
      const planList = (data.plans || []).filter(p => p.status === "active" || !p.status);
      setPlans(planList);
    } catch (err) {
      console.warn("Failed to load plans", err);
    }
  };

  const loadCompanyDetails = async () => {
    setFetchLoading(true);
    setError("");
    try {
      const { data } = await getCompanyByIdApi(companyId);
      const c = data.company || {};
      const admin = data.companyAdmin || {};

      setForm({
        companyName: c.companyName || "",
        ownerName: c.ownerName || "",
        ownerEmail: c.ownerEmail || c.email || "",
        ownerPhone: c.ownerPhone || c.phone || "",
        email: c.email || "",
        phone: c.phone || "",
        address: c.address || "",
        city: c.city || "",
        state: c.state || "",
        pincode: c.pincode || "",
        industryType: c.industryType || "Technology",
        planId: c.planId?._id || c.planId || "",
        planName: c.planName || "Custom",
        employeeLimit: String(c.employeeLimit || "50"),
        storageLimit: String(c.storageLimit || "5"),
        trialDays: String(c.trialDays || "7"),
        subscribedModules: Array.isArray(c.subscribedModules) && c.subscribedModules.length > 0
          ? c.subscribedModules
          : ["attendance", "leave", "payroll", "tasks", "projects", "reports", "leads"],
        moduleLimits: c.moduleLimits || {
          attendance: 0,
          leave: 0,
          payroll: 0,
          tasks: 0,
          leads: 0,
          projects: 0,
          reports: 0,
        },
        adminName: admin.name || c.ownerName || "",
        adminEmail: admin.email || c.email || "",
        adminPhone: admin.phone || c.phone || "",
        adminPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load company details");
    } finally {
      setFetchLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlanSelect = (plan) => {
    setForm((prev) => ({
      ...prev,
      planId: plan._id,
      planName: plan.planName,
      employeeLimit: String(plan.employeeLimit || prev.employeeLimit || 50),
      storageLimit: String(plan.storageLimit || prev.storageLimit || 5),
      trialDays: String(plan.trialDays || prev.trialDays || 7),
      subscribedModules: (Array.isArray(plan.modules) && plan.modules.length > 0)
        ? plan.modules
        : prev.subscribedModules,
      moduleLimits: plan.moduleLimits || prev.moduleLimits || {},
    }));
  };

  const toggleModule = (mod) => {
    setForm((prev) => {
      const current = prev.subscribedModules || [];
      const next = current.includes(mod)
        ? current.filter((m) => m !== mod)
        : [...current, mod];
      return { ...prev, subscribedModules: next };
    });
  };

  const updateModuleLimit = (modKey, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setForm((prev) => ({
      ...prev,
      moduleLimits: {
        ...(prev.moduleLimits || {}),
        [modKey]: num,
      },
    }));
  };

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-8) + "Aa1@";
    setForm((prev) => ({ ...prev, adminPassword: pwd }));
  };

  const handleSubmit = async () => {
    if (!form.companyName || !form.ownerName || !form.email) {
      Alert.alert("Validation Error", "Company name, owner name, and email are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        employeeLimit: Number(form.employeeLimit) || 50,
        storageLimit: Number(form.storageLimit) || 5,
        trialDays: Number(form.trialDays) || 7,
        ownerEmail: form.ownerEmail || form.email,
        adminEmail: form.adminEmail || form.email,
        adminName: form.adminName || form.ownerName,
        adminPhone: form.adminPhone || form.phone,
      };

      if (isEdit) {
        await updateCompanyApi(companyId, payload);
        Alert.alert("Success", "Company profile and module licenses updated successfully");
      } else {
        await createCompanyApi(payload);
        Alert.alert("Success", "Company tenant created and provisioned successfully");
      }
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.message || (isEdit ? "Failed to update company" : "Failed to create company");
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <SuperAdminLayout navigation={navigation}>
        <View style={styles.centerContainer}>
          <Loader />
          <Text style={styles.centerText}>Loading organization settings...</Text>
        </View>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Companies">
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={80}
      >
        {/* Header Title */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>
              {isEdit ? "Edit Company Licenses" : "Create Enterprise Tenant"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEdit
                ? "Update organization details, subscription tier, and seat caps"
                : "Provision a new client tenant with dedicated module licenses"}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Section 1: Organization Details */}
        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={16} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Organization Details</Text>
          </View>

          <AppInput
            label="Company Name *"
            placeholder="e.g. Acme Innovations Pvt Ltd"
            value={form.companyName}
            onChangeText={(v) => updateField("companyName", v)}
          />

          <AppInput
            label="Official Contact Email *"
            placeholder="contact@acme.com"
            value={form.email}
            onChangeText={(v) => updateField("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <AppInput
            label="Official Phone Number"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChangeText={(v) => updateField("phone", v)}
            keyboardType="phone-pad"
          />

          <AppInput
            label="Industry Classification"
            placeholder="e.g. Technology, Retail, Healthcare"
            value={form.industryType}
            onChangeText={(v) => updateField("industryType", v)}
          />

          <AppInput
            label="Street Address"
            placeholder="Office Suite / Tech Park"
            value={form.address}
            onChangeText={(v) => updateField("address", v)}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <AppInput
                label="City"
                placeholder="City"
                value={form.city}
                onChangeText={(v) => updateField("city", v)}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <AppInput
                label="State"
                placeholder="State"
                value={form.state}
                onChangeText={(v) => updateField("state", v)}
              />
            </View>
          </View>
        </AppCard>

        {/* Section 2: Primary Owner Contact */}
        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color="#06B6D4" />
            <Text style={styles.sectionTitle}>Primary Owner Contact</Text>
          </View>

          <AppInput
            label="Owner Full Name *"
            placeholder="e.g. Rajesh Sharma"
            value={form.ownerName}
            onChangeText={(v) => updateField("ownerName", v)}
          />

          <AppInput
            label="Owner Email *"
            placeholder="owner@acme.com"
            value={form.ownerEmail}
            onChangeText={(v) => updateField("ownerEmail", v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <AppInput
            label="Owner Phone"
            placeholder="+91 98765 43210"
            value={form.ownerPhone}
            onChangeText={(v) => updateField("ownerPhone", v)}
            keyboardType="phone-pad"
          />
        </AppCard>

        {/* Section 3: Subscription Preset & Base Limits */}
        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={16} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Subscription Tier & Limits</Text>
          </View>

          {/* Plan Presets Horizontal Scroll */}
          {plans.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputSubLabel}>Select Plan Preset</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {plans.map((p) => {
                  const isSelected = form.planId === p._id || form.planName === p.planName;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      onPress={() => handlePlanSelect(p)}
                      style={[
                        styles.planChip,
                        isSelected && styles.planChipActive,
                      ]}
                    >
                      <Text style={[styles.planChipName, isSelected && styles.planChipNameActive]}>
                        {p.planName}
                      </Text>
                      <Text style={[styles.planChipSeats, isSelected && styles.planChipSeatsActive]}>
                        {p.employeeLimit || 50} Seats • ₹{p.priceMonthly || 0}/mo
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 3 Base Quota Inputs */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <AppInput
                label="Total Seats"
                placeholder="50"
                value={form.employeeLimit}
                onChangeText={(v) => updateField("employeeLimit", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginHorizontal: 3 }}>
              <AppInput
                label="Storage (GB)"
                placeholder="5"
                value={form.storageLimit}
                onChangeText={(v) => updateField("storageLimit", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <AppInput
                label="Trial (Days)"
                placeholder="7"
                value={form.trialDays}
                onChangeText={(v) => updateField("trialDays", v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </AppCard>

        {/* Section 4: Entitled Suite Modules & Feature Licenses (12 Modules) */}
        <AppCard style={styles.card}>
          <View style={[styles.sectionHeader, { justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="hardware-chip-outline" size={16} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Entitled Suite Modules</Text>
            </View>
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>
                {form.subscribedModules.length} / {MODULES.length} Selected
              </Text>
            </View>
          </View>

          <Text style={styles.helpText}>
            Tap modules to enable or disable access for this company tenant.
          </Text>

          <View style={styles.modulesGrid}>
            {MODULES.map((mod) => {
              const isChecked = form.subscribedModules.includes(mod);
              return (
                <TouchableOpacity
                  key={mod}
                  onPress={() => toggleModule(mod)}
                  style={[
                    styles.moduleItem,
                    isChecked && styles.moduleItemActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isChecked ? "checkbox" : "square-outline"}
                    size={16}
                    color={isChecked ? "#f59e0b" : "#9ca3af"}
                  />
                  <Text
                    style={[
                      styles.moduleItemText,
                      isChecked && styles.moduleItemTextActive,
                    ]}
                  >
                    {mod.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AppCard>

        {/* Section 5: Per-Module Employee Seat Caps */}
        {form.subscribedModules.some((m) =>
          ["attendance", "leave", "payroll", "tasks", "leads", "projects", "reports"].includes(m)
        ) && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={16} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Per-Module Employee Seat Caps</Text>
            </View>
            <Text style={styles.helpText}>
              Set sub-quotas for specific modules (0 = All company employee seats).
            </Text>

            <View style={{ marginTop: 8 }}>
              {MODULE_CAP_ITEMS.filter((m) => form.subscribedModules.includes(m.key)).map((m) => (
                <View key={m.key} style={styles.capRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.capLabel, { color: m.color }]}>{m.label}</Text>
                    <Text style={styles.capSub}>
                      {form.moduleLimits?.[m.key] > 0
                        ? `Max ${form.moduleLimits[m.key]} employee seats`
                        : `Up to ${form.employeeLimit} seats (all employees)`}
                    </Text>
                  </View>
                  <View style={{ width: 100 }}>
                    <AppInput
                      placeholder="0"
                      value={String(form.moduleLimits?.[m.key] || 0)}
                      onChangeText={(v) => updateModuleLimit(m.key, v)}
                      keyboardType="numeric"
                      style={styles.capInput}
                    />
                  </View>
                </View>
              ))}
            </View>
          </AppCard>
        )}

        {/* Section 6: Initial Administrator Account */}
        {!isEdit && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key-outline" size={16} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Initial Admin Account</Text>
            </View>

            <View style={styles.hintBox}>
              <Ionicons name="sparkles" size={14} color="#f59e0b" />
              <Text style={styles.hintText}>
                Leave blank to automatically use the Owner Name & Email as initial administrator.
              </Text>
            </View>

            <AppInput
              label="Admin Full Name"
              placeholder="Leave blank for owner name"
              value={form.adminName}
              onChangeText={(v) => updateField("adminName", v)}
            />

            <AppInput
              label="Admin Email"
              placeholder="Leave blank for owner email"
              value={form.adminEmail}
              onChangeText={(v) => updateField("adminEmail", v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputSubLabel}>Initial Login Password</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <AppInput
                    placeholder="Auto-generated if left empty"
                    value={form.adminPassword}
                    onChangeText={(v) => updateField("adminPassword", v)}
                  />
                </View>
                <TouchableOpacity
                  onPress={generatePassword}
                  style={styles.generateBtn}
                >
                  <Text style={styles.generateBtnText}>Generate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AppCard>
        )}

        {/* Submit Actions */}
        <View style={styles.submitContainer}>
          <AppButton
            title={loading ? "Saving Company..." : isEdit ? "Update Company Licenses" : "Create & Provision Tenant"}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  centerText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  card: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  row: {
    flexDirection: "row",
  },
  inputSubLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 8,
  },
  planChipActive: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  planChipName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#cbd5e1",
  },
  planChipNameActive: {
    color: "#f59e0b",
  },
  planChipSeats: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  planChipSeatsActive: {
    color: "#f59e0b",
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  counterBadgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  helpText: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 12,
  },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    width: "48%",
    gap: 6,
  },
  moduleItemActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  moduleItemText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    flex: 1,
  },
  moduleItemTextActive: {
    color: "#f59e0b",
  },
  capRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  capLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  capSub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  capInput: {
    height: 38,
    fontSize: 12,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  hintText: {
    fontSize: 11,
    color: "#cbd5e1",
    flex: 1,
  },
  generateBtn: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  submitContainer: {
    marginTop: 8,
    marginBottom: 24,
    gap: 10,
  },
  submitBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 14,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default AddCompanyScreen;
