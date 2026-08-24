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
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const LoginScreen = () => {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    setError("");

    const result = await login({ email: email.trim(), password });
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Invalid credentials. Please try again.");
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password?",
      "Please contact your Company Administrator or HR Manager to reset your workspace password.",
      [{ text: "OK" }]
    );
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
        <View style={styles.glowBottomLeft} />

        <View style={styles.brandHeader}>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandTagline}>Business & HRMS Operations</Text>
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
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>Sign in to access your business workspace</Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL OR USERNAME</Text>
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
                  placeholder="name@company.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail("")} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              </View>
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
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError("");
                  }}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.submitBtnTouch}
              onPress={handleLogin}
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
                    <Text style={styles.submitBtnText}>Signing In...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.submitBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Company Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have a company account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLink}>Register Workspace</Text>
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
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  glowTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(18, 104, 217, 0.25)",
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(29, 125, 242, 0.15)",
  },
  brandHeader: {
    alignItems: "center",
  },
  logoImage: {
    width: 190,
    height: 62,
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
    marginTop: -24,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    color: "#0F172A",
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: FONTS.body,
    marginTop: 3,
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
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    color: "#475569",
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 11.5,
    color: "#1268D9",
    fontFamily: FONTS.bodyBold,
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
    fontSize: 14,
    color: "#0F172A",
    fontFamily: FONTS.body,
    padding: 0,
  },
  submitBtnTouch: {
    marginTop: 8,
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
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.3,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    flexWrap: "wrap",
    gap: 6,
  },
  registerPrompt: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: FONTS.body,
  },
  registerLink: {
    fontSize: 13,
    color: "#1268D9",
    fontFamily: FONTS.bodyBold,
  },
});

export default LoginScreen;
