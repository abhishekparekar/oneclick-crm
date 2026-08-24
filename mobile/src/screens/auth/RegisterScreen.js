import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { FONTS } from "../../theme/tokens";

const RegisterScreen = () => {
  const { register } = useAuth();
  const navigation = useNavigation();

  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState(null);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleRegister = async () => {
    const { companyName, ownerName, email, password, confirmPassword } = form;

    if (!companyName.trim() || !ownerName.trim() || !email.trim() || !password) {
      setError("Company Name, Owner Name, Email and Password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await register({
      companyName: companyName.trim(),
      ownerName: ownerName.trim(),
      email: email.trim(),
      phone: form.phone.trim(),
      password,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.message || "Registration failed. Please try again.");
    } else {
      Alert.alert(
        "🎉 Welcome!",
        "Your company workspace has been created successfully. Welcome to One Click HRMS!",
        [{ text: "Continue", onPress: () => navigation.navigate("Login") }]
      );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#071A2F" />

      {/* ── Top Hero Navy Banner ── */}
      <LinearGradient
        colors={["#071A2F", "#082B52", "#101827"]}
        style={styles.heroBackground}
      >
        <View style={styles.glowTopRight} />

        <View style={styles.brandHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTagline}>Register Company Workspace</Text>
        </View>
      </LinearGradient>

      {/* ── Main Form Body ── */}
      <KeyboardAvoidingView
        style={styles.keyboardFlex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Create Company Account</Text>
              <Text style={styles.cardSubtitle}>Setup your organization in under a minute</Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Company Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>COMPANY / ORGANIZATION NAME *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "companyName" && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={focusedInput === "companyName" ? "#1268D9" : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Acme Technologies Pvt Ltd"
                  placeholderTextColor="#94A3B8"
                  value={form.companyName}
                  onChangeText={set("companyName")}
                  onFocus={() => setFocusedInput("companyName")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Owner Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OWNER / ADMIN FULL NAME *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "ownerName" && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedInput === "ownerName" ? "#1268D9" : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94A3B8"
                  value={form.ownerName}
                  onChangeText={set("ownerName")}
                  onFocus={() => setFocusedInput("ownerName")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Official Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFFICIAL WORK EMAIL *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "email" && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedInput === "email" ? "#1268D9" : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="admin@company.com"
                  placeholderTextColor="#94A3B8"
                  value={form.email}
                  onChangeText={set("email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Contact Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER (OPTIONAL)</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "phone" && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={focusedInput === "phone" ? "#1268D9" : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  value={form.phone}
                  onChangeText={set("phone")}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedInput("phone")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CREATE PASSWORD *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "password" && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === "password" ? "#1268D9" : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#94A3B8"
                  value={form.password}
                  onChangeText={set("password")}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "confirmPassword" && styles.inputBoxFocused,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={focusedInput === "confirmPassword" ? "#1268D9" : "#64748B"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-type password"
                  placeholderTextColor="#94A3B8"
                  value={form.confirmPassword}
                  onChangeText={set("confirmPassword")}
                  secureTextEntry={!showConfirm}
                  onFocus={() => setFocusedInput("confirmPassword")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Submit Button */}
            <TouchableOpacity
              style={styles.submitBtnTouch}
              onPress={handleRegister}
              activeOpacity={0.88}
              disabled={loading}
            >
              <LinearGradient
                colors={["#082B52", "#1268D9", "#1D7DF2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.submitBtnText}>Creating Workspace...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.submitBtnText}>Create Company Workspace</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Sign In here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  heroBackground: {
    paddingTop: Platform.OS === "ios" ? 50 : 32,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  glowTopRight: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(18, 104, 217, 0.25)",
  },
  brandHeader: {
    alignItems: "center",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 0,
    top: 4,
    padding: 6,
  },
  logoImage: {
    width: 170,
    height: 54,
  },
  brandTagline: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  keyboardFlex: {
    flex: 1,
    marginTop: -22,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
    color: "#0F172A",
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10.5,
    color: "#475569",
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputBoxFocused: {
    borderColor: "#1268D9",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F172A",
    fontFamily: FONTS.body,
    padding: 0,
  },
  submitBtnTouch: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnGradient: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.3,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    flexWrap: "wrap",
    gap: 6,
  },
  loginPrompt: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: FONTS.body,
  },
  loginLink: {
    fontSize: 13,
    color: "#1268D9",
    fontFamily: FONTS.bodyBold,
  },
});

export default RegisterScreen;
