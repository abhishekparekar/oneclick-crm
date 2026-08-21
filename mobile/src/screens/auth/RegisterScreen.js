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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

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
        "Your 7-day free trial has started. You can add up to 10 employees.",
        [{ text: "Get Started" }]
      );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* ── Ambient Background Lighting (Orbs & Rings) ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top-Right Magenta/Purple Glow */}
        <View style={styles.topRightGlow}>
          <LinearGradient
            colors={["rgba(217, 70, 239, 0.32)", "rgba(139, 92, 246, 0.12)", "transparent"]}
            style={styles.glowCircle}
            start={{ x: 0.8, y: 0.2 }}
            end={{ x: 0.1, y: 0.9 }}
          />
        </View>

        {/* Top-Left Cyan Arc */}
        <View style={styles.topLeftGlow}>
          <Svg height={240} width={240} viewBox="0 0 240 240">
            <Defs>
              <SvgRadial id="cyanGlowReg" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                <Stop offset="70%" stopColor="#3B82F6" stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
              </SvgRadial>
            </Defs>
            <Circle cx="120" cy="120" r="100" fill="url(#cyanGlowReg)" />
            <Circle
              cx="120"
              cy="120"
              r="85"
              stroke="#06B6D4"
              strokeWidth="2"
              strokeOpacity="0.45"
              fill="none"
            />
          </Svg>
        </View>

        {/* Bottom-Right Warm Amber Aura */}
        <View style={styles.bottomRightGlow}>
          <Svg height={350} width={350} viewBox="0 0 350 350">
            <Defs>
              <SvgRadial id="amberGlowReg" cx="60%" cy="60%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#F97316" stopOpacity="0.4" />
                <Stop offset="50%" stopColor="#EA580C" stopOpacity="0.2" />
                <Stop offset="80%" stopColor="#E11D48" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
              </SvgRadial>
            </Defs>
            <Circle cx="200" cy="200" r="160" fill="url(#amberGlowReg)" />
            <Circle
              cx="200"
              cy="200"
              r="130"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeOpacity="0.4"
              fill="none"
            />
          </Svg>
        </View>

        {/* Mid-Left Purple Ring */}
        <View style={styles.midLeftRing}>
          <Svg height={200} width={200} viewBox="0 0 200 200">
            <Circle
              cx="100"
              cy="100"
              r="80"
              stroke="#A855F7"
              strokeWidth="14"
              strokeOpacity="0.3"
              fill="none"
            />
          </Svg>
        </View>

        {/* Decorative Triangles */}
        <View style={styles.triangleTopRight} />
        <View style={styles.triangleBottomLeft} />
      </View>

      {/* ── Main Scroll View (Seamless High-Contrast Form) ── */}
      <KeyboardAvoidingView
        style={styles.keyboardFlex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Trial Pill Badge */}
          <View style={styles.trialBadge}>
            <LinearGradient
              colors={["rgba(249, 115, 22, 0.25)", "rgba(234, 88, 12, 0.15)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.trialGradient}
            >
              <Ionicons name="sparkles" size={14} color="#FB923C" />
              <Text style={styles.trialBadgeText}>
                7-Day Free Trial • 10 Employees Included
              </Text>
            </LinearGradient>
          </View>

          {/* Header */}
          <View style={styles.titleSection}>
            <Text style={styles.heading}>
              <Text style={styles.headingOrange}>Register </Text>
              <Text style={styles.headingPurple}>Com</Text>
              <Text style={styles.headingCyan}>pany</Text>
            </Text>
            <Text style={styles.subheading}>
              Set up your One Click Business workspace
            </Text>
          </View>

          {/* Form Fields with High Contrast & Clear Boundaries */}
          <View style={styles.formContainer}>
            {/* Company Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>COMPANY NAME *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "companyName" ? styles.inputBoxFocused : styles.inputBoxUnfocused,
                ]}
              >
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="business"
                    size={18}
                    color={focusedInput === "companyName" ? "#FB923C" : "#F59E0B"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={form.companyName}
                  onChangeText={set("companyName")}
                  onFocus={() => setFocusedInput("companyName")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="e.g. Acme Corporation"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Owner Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OWNER / ADMIN NAME *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "ownerName" ? styles.inputBoxFocused : styles.inputBoxUnfocused,
                ]}
              >
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="person"
                    size={18}
                    color={focusedInput === "ownerName" ? "#38BDF8" : "#06B6D4"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={form.ownerName}
                  onChangeText={set("ownerName")}
                  onFocus={() => setFocusedInput("ownerName")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Work Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WORK EMAIL ADDRESS *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "email" ? styles.inputBoxFocused : styles.inputBoxUnfocused,
                ]}
              >
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="mail"
                    size={18}
                    color={focusedInput === "email" ? "#A855F7" : "#C084FC"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={form.email}
                  onChangeText={set("email")}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="admin@company.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "phone" ? styles.inputBoxFocused : styles.inputBoxUnfocused,
                ]}
              >
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="call"
                    size={18}
                    color={focusedInput === "phone" ? "#22C55E" : "#4ADE80"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={form.phone}
                  onChangeText={set("phone")}
                  onFocus={() => setFocusedInput("phone")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD *</Text>
              <View
                style={[
                  styles.inputBox,
                  focusedInput === "password" ? styles.inputBoxFocused : styles.inputBoxUnfocused,
                ]}
              >
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={18}
                    color={focusedInput === "password" ? "#FB923C" : "#F59E0B"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={form.password}
                  onChangeText={set("password")}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Create a strong password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={21}
                    color={showPassword ? "#38BDF8" : "#94A3B8"}
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
                  focusedInput === "confirmPassword" ? styles.inputBoxFocused : styles.inputBoxUnfocused,
                ]}
              >
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={focusedInput === "confirmPassword" ? "#38BDF8" : "#06B6D4"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={form.confirmPassword}
                  onChangeText={set("confirmPassword")}
                  onFocus={() => setFocusedInput("confirmPassword")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off" : "eye"}
                    size={21}
                    color={showConfirm ? "#38BDF8" : "#94A3B8"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#F87171" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtnTouch}
              onPress={handleRegister}
              activeOpacity={0.88}
              disabled={loading}
            >
              <LinearGradient
                colors={["#FF6B00", "#F43F5E", "#A855F7", "#06B6D4"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.submitBtnText}>Creating Workspace...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.submitBtnText}>Create Company Workspace</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginHint}>Already have a company account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>
                  <Text style={{ color: "#FB923C" }}>Sign </Text>
                  <Text style={{ color: "#38BDF8" }}>In →</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Watermark Footer */}
            <Text style={styles.footerCopyright}>
              © One Click Business HRMS • Powered by icoded
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  keyboardFlex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 40,
    justifyContent: "center",
  },

  /* Background Glow Orbs */
  topRightGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 270,
    height: 270,
    borderRadius: 135,
    overflow: "hidden",
  },
  topLeftGlow: {
    position: "absolute",
    top: -30,
    left: -40,
    width: 240,
    height: 240,
  },
  bottomRightGlow: {
    position: "absolute",
    bottom: -80,
    right: -80,
    width: 350,
    height: 350,
  },
  midLeftRing: {
    position: "absolute",
    bottom: 240,
    left: -60,
    width: 200,
    height: 200,
  },
  glowCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 135,
  },
  triangleTopRight: {
    position: "absolute",
    top: "15%",
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FB923C",
    transform: [{ rotate: "25deg" }],
    opacity: 0.8,
  },
  triangleBottomLeft: {
    position: "absolute",
    bottom: 120,
    left: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F59E0B",
    transform: [{ rotate: "-40deg" }],
    opacity: 0.85,
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    marginBottom: 14,
  },
  logoImage: {
    width: 205,
    height: 62,
  },

  /* Free Trial Badge */
  trialBadge: {
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: "rgba(249, 115, 22, 0.5)",
  },
  trialGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 7,
  },
  trialBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    fontWeight: "800",
    color: "#FB923C",
  },

  /* Title */
  titleSection: {
    alignItems: "center",
    marginBottom: 26,
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 29,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headingOrange: {
    color: "#FB923C",
  },
  headingPurple: {
    color: "#F472B6",
  },
  headingCyan: {
    color: "#38BDF8",
  },
  subheading: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: "#CBD5E1",
    textAlign: "center",
    maxWidth: 320,
  },

  /* Form */
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    fontWeight: "800",
    color: "#E2E8F0",
    letterSpacing: 1.1,
    marginBottom: 7,
    marginLeft: 2,
  },

  /* High-Contrast Input Container */
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputBoxUnfocused: {
    backgroundColor: "#131C2E",
    borderWidth: 1.5,
    borderColor: "#2D3E5F",
  },
  inputBoxFocused: {
    backgroundColor: "#16233B",
    borderWidth: 1.8,
    borderColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  iconBadge: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15.5,
    fontWeight: "500",
    color: "#FFFFFF",
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },

  /* Error */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderWidth: 1.2,
    borderColor: "#EF4444",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.bodyBold,
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },

  /* Submit Button */
  submitBtnTouch: {
    borderRadius: 27,
    overflow: "hidden",
    marginTop: 6,
    shadowColor: "#F43F5E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  submitGradient: {
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  /* Login Link */
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },
  loginHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: "#CBD5E1",
  },
  loginLink: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    fontWeight: "800",
  },

  /* Watermark Footer */
  footerCopyright: {
    fontFamily: FONTS.body,
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 28,
  },
});

export default RegisterScreen;
