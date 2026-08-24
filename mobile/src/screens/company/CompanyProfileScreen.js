import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import { getCompanyProfileApi, updateCompanyProfileApi } from "../../api/companyService";

const InputField = ({ label, value, onChangeText, icon, keyboardType = "default", autoCapitalize = "sentences", editable = true }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, !editable && styles.disabledInputWrapper]}>
      <Ionicons name={icon} size={18} color={editable ? "#64748b" : "#94a3b8"} style={styles.inputIcon} />
      <TextInput
        style={[styles.textInput, !editable && styles.disabledTextInput]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor="#94a3b8"
        editable={editable}
      />
    </View>
    {!editable && (
      <Text style={styles.helperText}>Locked for compliance. Contact Super Admin to change.</Text>
    )}
  </View>
);

const CompanyProfileScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    industryType: "",
  });
  const [planInfo, setPlanInfo] = useState({ planName: "Standard", employeeLimit: 50, status: "Active", paymentStatus: "Paid" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "trial":
        return "#22c55e"; // Green
      case "expired":
      case "cancelled":
        return "#ef4444"; // Red
      default:
        return "#64748b"; // Slate
    }
  };

  const getPaymentColor = (paymentStatus) => {
    switch (paymentStatus?.toLowerCase()) {
      case "paid":
        return "#0284c7"; // Blue
      case "pending":
        return "#ea580c"; // Orange
      case "failed":
        return "#ef4444"; // Red
      default:
        return "#64748b"; // Slate
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getCompanyProfileApi();
      if (data && data.company) {
        const c = data.company;
        setForm({
          companyName: c.companyName || "",
          ownerName: c.ownerName || "",
          email: c.email || "",
          phone: c.phone || "",
          address: c.address || "",
          industryType: c.industryType || "",
        });
        setPlanInfo({
          planName: c.planName || "Standard",
          employeeLimit: c.employeeLimit || 50,
          status: c.status || "Active",
          paymentStatus: c.paymentStatus || "Paid",
          endDate: c.subscriptionEndDate ? new Date(c.subscriptionEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load company profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.ownerName.trim()) {
      Alert.alert("Required", "Company Name and Owner Name are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await updateCompanyProfileApi(form);
      setSuccess("Company profile updated successfully");
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !form.companyName) return <Loader />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header subscription card */}
        <View style={styles.planCard}>
          <View style={styles.planIconBg}>
            <Ionicons name="ribbon" size={24} color="#ffffff" />
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planTitle}>Subscription Plan: {(planInfo?.planName || "Standard").toUpperCase()}</Text>
            <Text style={styles.planLimit}>Staff Onboard Limit: {planInfo?.employeeLimit || 0} Members</Text>
            {planInfo?.endDate && (
              <Text style={[styles.planLimit, { color: "#94a3b8" }]}>Expires On: {planInfo.endDate}</Text>
            )}
            <View style={styles.planBadgeRow}>
              <View style={[styles.badge, { backgroundColor: getStatusColor(planInfo?.status) }]}>
                <Text style={styles.badgeText}>{(planInfo?.status || "Active").toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, { marginLeft: 8, backgroundColor: getPaymentColor(planInfo?.paymentStatus) }]}>
                <Text style={styles.badgeText}>PAYMENT: {(planInfo?.paymentStatus || "Paid").toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile details editor */}
        <Text style={styles.sectionTitle}>ORGANIZATION DETAILS</Text>
        <View style={styles.formCard}>
          <InputField
            label="Company Name"
            value={form.companyName}
            icon="business"
            editable={false}
          />
          <InputField
            label="Owner Name"
            value={form.ownerName}
            onChangeText={(v) => updateField("ownerName", v)}
            icon="person"
          />
          <InputField
            label="Email Address"
            value={form.email}
            onChangeText={(v) => updateField("email", v)}
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Contact Phone"
            value={form.phone}
            onChangeText={(v) => updateField("phone", v)}
            icon="call"
            keyboardType="phone-pad"
          />
          <InputField
            label="Headquarters Address"
            value={form.address}
            onChangeText={(v) => updateField("address", v)}
            icon="home"
          />
          <InputField
            label="Industry Category"
            value={form.industryType}
            onChangeText={(v) => updateField("industryType", v)}
            icon="git-network"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <AppButton
          title={saving ? "Saving Profile..." : "Save Company Details"}
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  planCard: {
    backgroundColor: "#1b2a47", // Solid premium navy
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  planIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: {
    marginLeft: 16,
    flex: 1,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  planLimit: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 4,
    fontWeight: "600",
  },
  planBadgeRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  badge: {
    backgroundColor: "#22c55e",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#1e293b",
    fontWeight: "600",
    padding: 0,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  successText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#1268D9",
    height: 46,
  },
  disabledInputWrapper: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  disabledTextInput: {
    color: "#64748b",
  },
  helperText: {
    fontSize: 9.5,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },
});

export default CompanyProfileScreen;
