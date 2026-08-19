import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import {
  createCompanyApi,
  getCompanyByIdApi,
  updateCompanyApi,
} from "../../api/superAdminService";

const AddCompanyScreen = ({ route, navigation }) => {
  const companyId = route.params?.companyId;
  const isEdit = !!companyId;

  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    industryType: "",
    planName: "Basic",
    employeeLimit: "50",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      loadCompanyDetails();
    }
  }, [companyId]);

  const loadCompanyDetails = async () => {
    setFetchLoading(true);
    setError("");
    try {
      const { data } = await getCompanyByIdApi(companyId);
      const c = data.company;
      const admin = data.companyAdmin || {};
      
      setForm({
        companyName: c.companyName || "",
        ownerName: c.ownerName || "",
        email: c.email || "",
        phone: c.phone || "",
        address: c.address || "",
        industryType: c.industryType || "",
        planName: c.planName || "Basic",
        employeeLimit: String(c.employeeLimit || "50"),
        adminName: admin.name || c.ownerName || "",
        adminEmail: admin.email || c.email || "",
        adminPhone: admin.phone || c.phone || "",
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

  const handleSubmit = async () => {
    if (!form.companyName || !form.ownerName || !form.email) {
      setError("Company name, owner name, and email are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        employeeLimit: Number(form.employeeLimit) || 50,
        adminEmail: form.adminEmail || form.email,
        adminName: form.adminName || form.ownerName,
        adminPhone: form.adminPhone || form.phone,
      };

      if (isEdit) {
        await updateCompanyApi(companyId, payload);
        Alert.alert("Success", "Company updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        const { data } = await createCompanyApi(payload);
        Alert.alert(
          "Company Created",
          `Company: ${data.company.companyName}\n\nCompany Admin Login:\nEmail: ${data.adminLogin.email}\nTemporary Password: ${data.adminLogin.temporaryPassword}\n\nShare these credentials with the company admin.`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} company`);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <SuperAdminLayout navigation={navigation} activeTab="Companies">
        <Loader />
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Companies">
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
          <Text style={styles.title}>{isEdit ? "Edit Company Details" : "Create New Company"}</Text>

          <Text style={styles.section}>Company Details</Text>
          <AppInput
            label="Company Name *"
            value={form.companyName}
            onChangeText={(v) => updateField("companyName", v)}
            placeholder="Acme Corp"
          />
          <AppInput
            label="Owner Name *"
            value={form.ownerName}
            onChangeText={(v) => updateField("ownerName", v)}
            placeholder="John Doe"
          />
          <AppInput
            label="Company Email *"
            value={form.email}
            onChangeText={(v) => updateField("email", v)}
            placeholder="contact@acme.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEdit} // Disable email change if editing
          />
          <AppInput
            label="Phone"
            value={form.phone}
            onChangeText={(v) => updateField("phone", v)}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
          />
          <AppInput
            label="Address"
            value={form.address}
            onChangeText={(v) => updateField("address", v)}
            placeholder="Main Street, Road 1"
          />
          <AppInput
            label="Industry Type"
            value={form.industryType}
            onChangeText={(v) => updateField("industryType", v)}
            placeholder="IT, Manufacturing..."
          />
          <AppInput
            label="Plan Name"
            value={form.planName}
            onChangeText={(v) => updateField("planName", v)}
            placeholder="Basic"
          />
          <AppInput
            label="Employee Limit"
            value={form.employeeLimit}
            onChangeText={(v) => updateField("employeeLimit", v)}
            placeholder="50"
            keyboardType="numeric"
          />

          {!isEdit && (
            <>
              <Text style={styles.section}>Company Admin Login</Text>
              <AppInput
                label="Admin Name"
                value={form.adminName}
                onChangeText={(v) => updateField("adminName", v)}
                placeholder="Defaults to owner name"
              />
              <AppInput
                label="Admin Email"
                value={form.adminEmail}
                onChangeText={(v) => updateField("adminEmail", v)}
                placeholder="Defaults to company email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppInput
                label="Admin Phone"
                value={form.adminPhone}
                onChangeText={(v) => updateField("adminPhone", v)}
                placeholder="Optional"
                keyboardType="phone-pad"
              />
              <AppInput
                label="Admin Password"
                value={form.adminPassword}
                onChangeText={(v) => updateField("adminPassword", v)}
                placeholder="Optional (auto-generated if blank)"
                secureTextEntry
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            title={isEdit ? "Update Company" : "Create Company"}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
      </KeyboardAwareScrollView>
    </SuperAdminLayout>
);
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f3f4f6" },
  container: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  section: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 4,
  },
  error: {
    color: "#ef4444",
    marginBottom: 12,
    textAlign: "center",
  },
  submitBtn: {
    marginTop: 20,
  },
});

export default AddCompanyScreen;
