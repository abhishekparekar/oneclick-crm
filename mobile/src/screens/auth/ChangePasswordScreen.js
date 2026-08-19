import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import AppCard from "../../components/AppCard";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/AuthContext";
import { changePasswordApi } from "../../api/authService";

const ChangePasswordScreen = () => {
  const { updateUser, logout, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async () => {
    console.log("[ChangePasswordScreen] Update password button pressed");

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please fill out both password fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("[ChangePasswordScreen] Submitting password update request");
      const { data } = await changePasswordApi(password.trim());
      
      if (data.success && data.user) {
        console.log("[ChangePasswordScreen] Password updated successfully");
        Alert.alert(
          "Success",
          "Your password has been set successfully. Welcome to HRMS!",
          [
            {
              text: "Get Started",
              onPress: () => {
                // Update context state which automatically transitions user to the Main stack
                updateUser(data.user);
              },
            },
          ]
        );
      } else {
        setError(data.message || "Failed to update password");
      }
    } catch (err) {
      console.error("[ChangePasswordScreen] Error updating password:", err);
      setError(
        err.response?.data?.message ||
          "Network error. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Log Out",
      "Are you sure you want to go back to the login screen?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.badge}>Security Required</Text>
          <Text style={styles.heading}>Secure Your Account</Text>
          <Text style={styles.subheading}>
            Hi {user?.name || "there"}, you're logging in with a temporary password. For your security, you must set a new password before proceeding.
          </Text>
        </View>

        <AppCard style={styles.card}>
          <AppInput
            label="New Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password (min. 6 chars)"
            secureTextEntry
            autoCapitalize="none"
          />
          <AppInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password requirements:</Text>
            <Text style={styles.requirementItem}>• Must be at least 6 characters long</Text>
            <Text style={styles.requirementItem}>• Make sure it is secure and unique</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            title="Update Password & Continue"
            onPress={handleChangePassword}
            loading={loading}
            style={styles.button}
          />

          <AppButton
            title="Cancel & Log Out"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  headerContainer: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: "uppercase",
    marginBottom: 8,
    overflow: "hidden",
  },
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  card: {
    width: "100%",
  },
  requirementsContainer: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 4,
  },
  requirementItem: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 12,
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default ChangePasswordScreen;
