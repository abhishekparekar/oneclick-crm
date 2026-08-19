import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import EmployeeLayout from "../../components/EmployeeLayout";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { regularizationRequestApi } from "../../api/attendanceService";

const EmployeeRegularizationRequestScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { date, attendanceId } = route.params || {};
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const Layout = user?.role === "manager" ? ManagerLayout : EmployeeLayout;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Input Required", "Please provide a valid explanation or reason for requesting a correction.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        date,
        reason: reason.trim(),
        ...(attendanceId ? { attendanceId } : {}),
      };
      
      const { data } = await regularizationRequestApi(payload);
      if (data && data.success) {
        Alert.alert(
          "✅ Request Submitted",
          "Your correction request has been logged successfully and sent to your manager for approval.",
          [
            {
              text: "Done",
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert("Submission Failed", data.message || "Failed to submit regularization request.");
      }
    } catch (err) {
      console.error("Regularization submission failed:", err);
      Alert.alert("Submission Failed", err.response?.data?.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout navigation={navigation} title="Request Correction">
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={100}
      >
        {/* Info Header Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-alert-outline" size={24} color="#ea580c" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Attendance Correction</Text>
            <Text style={styles.infoText}>
              Employees cannot manually edit attendance logs. You can only request adjustments by submitting a reason for review by your administrator.
            </Text>
          </View>
        </View>

        {/* Form Details Card */}
        <AppCard style={styles.formCard}>
          <Text style={styles.sectionHeading}>Adjustment Details</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Selected Date:</Text>
            <Text style={styles.value}>
              {date ? new Date(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}
            </Text>
          </View>

          {attendanceId && (
            <View style={styles.row}>
              <Text style={styles.label}>Record ID:</Text>
              <Text style={[styles.value, styles.code]}>{attendanceId}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Reason for Correction Request *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={5}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g., Forgot to punch out due to client meeting / GPS location mismatch / punch-in missed..."
            placeholderTextColor="#94a3b8"
          />

          <AppButton
            title={loading ? "Submitting Request..." : "Submit Correction Request"}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
            icon="checkmark-circle-outline"
          />
        </AppCard>
      </KeyboardAwareScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#c2410c",
    marginBottom: 3,
  },
  infoText: {
    fontSize: 11.5,
    color: "#7c2d12",
    lineHeight: 16,
    fontWeight: "500",
  },
  formCard: {
    padding: 16,
    backgroundColor: "#ffffff",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  value: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "700",
  },
  code: {
    fontFamily: "monospace",
    fontSize: 11.5,
    color: "#475569",
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#475569",
    marginTop: 6,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    fontSize: 13,
    color: "#334155",
    height: 120,
    textAlignVertical: "top",
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 20,
  },
});

export default EmployeeRegularizationRequestScreen;
