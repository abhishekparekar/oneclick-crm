import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import AppCard from "../../components/AppCard";
import {
  getSystemSettingsApi,
  updateSystemSettingsApi,
} from "../../api/superAdminService";

const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Singapore",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

const SystemSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    appName: "One Click Business",
    supportEmail: "support@icodedhrms.com",
    supportPhone: "+91 9876543210",
    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
    maintenanceMode: false,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getSystemSettingsApi();
      if (data.settings) {
        setForm({
          appName: data.settings.appName || "One Click Business",
          supportEmail: data.settings.supportEmail || "support@icodedhrms.com",
          supportPhone: data.settings.supportPhone || "+91 9876543210",
          defaultCurrency: data.settings.defaultCurrency || "INR",
          timezone: data.settings.timezone || "Asia/Kolkata",
          maintenanceMode: !!data.settings.maintenanceMode,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load system configurations");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [])
  );

  const handleSave = async () => {
    if (!form.appName.trim()) {
      Alert.alert("Validation Error", "Application name is required");
      return;
    }
    if (!form.supportEmail.trim()) {
      Alert.alert("Validation Error", "Support email is required");
      return;
    }

    setSaving(true);
    try {
      await updateSystemSettingsApi(form);
      Alert.alert("Success", "System settings updated successfully!");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update system configurations");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>System Control & Settings</Text>

        {loading ? (
          <Loader />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            {/* General Info Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="settings-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Global Branding</Text>
              </View>

              <AppInput
                label="Application Name"
                value={form.appName}
                onChangeText={(v) => setForm((p) => ({ ...p, appName: v }))}
                placeholder="E.g. One Click Business"
              />

              <Text style={styles.fieldLabel}>Default Currency Prefix</Text>
              <View style={styles.optionsRow}>
                {CURRENCIES.map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[styles.optionBtn, form.defaultCurrency === curr && styles.optionBtnActive]}
                    onPress={() => setForm((p) => ({ ...p, defaultCurrency: curr }))}
                  >
                    <Text style={[styles.optionText, form.defaultCurrency === curr && styles.optionTextActive]}>
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Global Timezone</Text>
              <View style={styles.optionsRow}>
                {TIMEZONES.map((tz) => (
                  <TouchableOpacity
                    key={tz}
                    style={[styles.optionBtn, form.timezone === tz && styles.optionBtnActive]}
                    onPress={() => setForm((p) => ({ ...p, timezone: tz }))}
                  >
                    <Text style={[styles.optionText, form.timezone === tz && styles.optionTextActive]}>
                      {tz.split("/")[1] || tz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </AppCard>

            {/* Support Info Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="help-buoy-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Helpdesk Contacts</Text>
              </View>

              <AppInput
                label="Support Email Address"
                value={form.supportEmail}
                onChangeText={(v) => setForm((p) => ({ ...p, supportEmail: v }))}
                placeholder="E.g. support@domain.com"
                keyboardType="email-address"
              />

              <AppInput
                label="Support Phone Line"
                value={form.supportPhone}
                onChangeText={(v) => setForm((p) => ({ ...p, supportPhone: v }))}
                placeholder="E.g. +91 98765 43210"
                keyboardType="phone-pad"
              />
            </AppCard>

            {/* System Control Settings */}
            <AppCard style={[styles.card, form.maintenanceMode && styles.maintenanceCardActive]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name={form.maintenanceMode ? "alert-circle" : "shield-checkmark-outline"}
                  size={18}
                  color={form.maintenanceMode ? "#dc2626" : "#059669"}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.cardTitle, form.maintenanceMode && { color: "#dc2626" }]}>
                  System Status & Mode
                </Text>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Enable Maintenance Mode</Text>
                  <Text style={styles.switchDesc}>
                    Blocks standard users from logging in, displaying a maintenance warning screen instead.
                  </Text>
                </View>
                <Switch
                  value={form.maintenanceMode}
                  onValueChange={(v) => setForm((p) => ({ ...p, maintenanceMode: v }))}
                  trackColor={{ false: "#cbd5e1", true: "#fca5a5" }}
                  thumbColor={form.maintenanceMode ? "#dc2626" : "#f1f5f9"}
                />
              </View>
            </AppCard>

            <AppButton
              title="Save System Settings"
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            />
          </ScrollView>
        )}
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, padding: 16, borderRadius: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginTop: 12, marginBottom: 8 },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  optionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  optionBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  optionText: { fontSize: 12, color: "#475569" },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchTextContainer: { flex: 1, marginRight: 16 },
  switchLabel: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  switchDesc: { fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 15 },
  maintenanceCardActive: { borderColor: "#fecaca", backgroundColor: "#fff5f5" },
  saveBtn: { marginTop: 12, marginBottom: 20 },
  errorText: { color: "#ef4444", padding: 16, textAlign: "center" },
});

export default SystemSettingsScreen;
