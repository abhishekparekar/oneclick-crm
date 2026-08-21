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
import Svg, { Circle, Path, Defs, RadialGradient as SvgRadial, Stop } from "react-native-svg";
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

  const handleGoogleSignIn = () => {
    Alert.alert(
      "Google Sign-In",
      "Single Sign-On (SSO) with Google is active for connected enterprise workspaces. Please sign in via web or use your company credentials.",
      [{ text: "Understood" }]
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* ── Atmospheric Ambient Glowing Background Orbs & Rings ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top-Left Magenta / Purple Glow */}
        <View style={styles.topLeftGlow}>
          <LinearGradient
            colors={["rgba(217, 70, 239, 0.32)", "rgba(139, 92, 246, 0.15)", "transparent"]}
            style={styles.glowCircle}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 0.9, y: 0.9 }}
          />
        </View>

        {/* Top-Right Cyan Neon Arc */}
        <View style={styles.topRightGlow}>
          <Svg height={260} width={260} viewBox="0 0 260 260">
            <Defs>
              <SvgRadial id="cyanGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                <Stop offset="70%" stopColor="#3B82F6" stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
              </SvgRadial>
            </Defs>
            <Circle cx="130" cy="130" r="110" fill="url(#cyanGlow)" />
            <Circle
              cx="130"
              cy="130"
              r="95"
              stroke="#06B6D4"
              strokeWidth="2"
              strokeOpacity="0.45"
              fill="none"
            />
            <Circle
              cx="130"
              cy="130"
              r="120"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeOpacity="0.25"
              fill="none"
            />
          </Svg>
        </View>

        {/* Bottom-Left Warm Amber/Orange Radial Aura */}
        <View style={styles.bottomLeftGlow}>
          <Svg height={380} width={380} viewBox="0 0 380 380">
            <Defs>
              <SvgRadial id="amberGlow" cx="40%" cy="60%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#F97316" stopOpacity="0.45" />
                <Stop offset="50%" stopColor="#EA580C" stopOpacity="0.22" />
                <Stop offset="80%" stopColor="#E11D48" stopOpacity="0.08" />
                <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
              </SvgRadial>
            </Defs>
            <Circle cx="150" cy="230" r="180" fill="url(#amberGlow)" />
            <Circle
              cx="150"
              cy="230"
              r="140"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeOpacity="0.45"
              fill="none"
            />
          </Svg>
        </View>

        {/* Right-Side Purple Ring Accent */}
        <View style={styles.midRightRing}>
          <Svg height={220} width={220} viewBox="0 0 220 220">
            <Circle
              cx="110"
              cy="110"
              r="90"
              stroke="#A855F7"
              strokeWidth="14"
              strokeOpacity="0.3"
              fill="none"
            />
          </Svg>
        </View>

        {/* Decorative Geometric Triangles */}
        <View style={styles.triangleLeft} />
        <View style={styles.triangleRight} />
      </View>

      {/* ── Main Content Form ── */}
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

          {/* Heading with Clear Contrast */}
          <View style={styles.titleSection}>
            <Text style={styles.heading}>
              <Text style={styles.headingOrange}>Welcome </Text>
              <Text style={styles.headingPurple}>Ba</Text>
              <Text style={styles.headingCyan}>ck</Text>
            </Text>
            <Text style={styles.subheading}>
              Sign in to your One Click Business workspace
            </Text>
          </View>

          {/* Form Fields with High Contrast & Clear Boundaries */}
          <View style={styles.formContainer}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
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
                    color={focusedInput === "email" ? "#FB923C" : "#F59E0B"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="you@company.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
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
                    color={focusedInput === "password" ? "#38BDF8" : "#06B6D4"}
                  />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={21}
                    color={showPassword ? "#38BDF8" : "#94A3B8"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#F87171" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Multi-Stop Gradient Sign In Button */}
            <TouchableOpacity
              style={styles.signInBtnTouch}
              onPress={handleLogin}
              activeOpacity={0.88}
              disabled={loading}
            >
              <LinearGradient
                colors={["#FF6B00", "#F43F5E", "#A855F7", "#06B6D4"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.signInGradient}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.signInBtnText}>Authenticating...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign in with Google Button */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
                <Path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <Path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <Path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <Path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </Svg>
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerHint}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLink}>
                  <Text style={{ color: "#FB923C" }}>Register </Text>
                  <Text style={{ color: "#F472B6" }}>Company </Text>
                  <Text style={{ color: "#38BDF8" }}>→</Text>
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

  /* Ambient Glow Background */
  topLeftGlow: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
  },
  topRightGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 260,
    height: 260,
  },
  bottomLeftGlow: {
    position: "absolute",
    bottom: -80,
    left: -100,
    width: 380,
    height: 380,
  },
  midRightRing: {
    position: "absolute",
    bottom: 120,
    right: -70,
    width: 220,
    height: 220,
  },
  glowCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 140,
  },
  triangleLeft: {
    position: "absolute",
    top: "46%",
    left: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#F59E0B",
    transform: [{ rotate: "-35deg" }],
    opacity: 0.85,
  },
  triangleRight: {
    position: "absolute",
    bottom: 90,
    right: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 17,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FB923C",
    transform: [{ rotate: "45deg" }],
    opacity: 0.9,
  },

  /* Header & Logo */
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoImage: {
    width: 215,
    height: 66,
  },

  /* Titles */
  titleSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 31,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
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
    fontSize: 14.5,
    color: "#CBD5E1",
    textAlign: "center",
    maxWidth: 320,
  },

  /* Form Container */
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    fontWeight: "800",
    color: "#E2E8F0",
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
  },

  /* High-Contrast Distinct Input Container */
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

  /* Forgot Password */
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 22,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: "#38BDF8",
    fontWeight: "700",
  },

  /* Error Box */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderWidth: 1.2,
    borderColor: "#EF4444",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  errorText: {
    fontFamily: FONTS.bodyBold,
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },

  /* Sign In Button */
  signInBtnTouch: {
    borderRadius: 27,
    overflow: "hidden",
    shadowColor: "#F43F5E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  signInGradient: {
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
  signInBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16.5,
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

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1.2,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  dividerText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    marginHorizontal: 14,
    letterSpacing: 1.2,
  },

  /* Google Button */
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 26,
    backgroundColor: "#131C2E",
    borderWidth: 1.4,
    borderColor: "#2D3E5F",
  },
  googleBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Register Row */
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
    gap: 6,
  },
  registerHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: "#CBD5E1",
  },
  registerLink: {
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
    marginTop: 32,
  },
});

export default LoginScreen;
