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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { COLORS, ROUNDING, FONTS, SHADOWS } from "../../theme/tokens";

const LoginScreen = () => {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError(result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Un-cropped Full Logo Display */}
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../../assets/icoded_logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Sign in to access your workspace</Text>

        {/* Email Address Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} activeOpacity={0.7}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.buttonTouch}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.buttonText}>Authenticating...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Register Link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerHint}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")} activeOpacity={0.7}>
            <Text style={styles.registerLink}>Register Company →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerCopyright}>© Nextact HRMS • Powered by icoded</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoWrapper: {
    alignSelf: "center",
    width: 170,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    color: COLORS.darkNavy,
    textAlign: "center",
    marginBottom: 4,
  },
  subheading: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13.5,
    color: COLORS.text.muted,
    textAlign: "center",
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: COLORS.darkNavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: ROUNDING.lg,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14.5,
    color: COLORS.darkNavy,
    height: "100%",
  },
  eyeIcon: {
    padding: 6,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    fontFamily: FONTS.bodyMedium,
    color: "#EF4444",
    fontSize: 12.5,
    flex: 1,
  },
  buttonTouch: {
    borderRadius: ROUNDING.xl,
    overflow: "hidden",
    marginTop: 8,
    ...SHADOWS.md,
  },
  buttonGradient: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
    fontSize: 15.5,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    gap: 4,
  },
  registerHint: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
    fontSize: 13.5,
  },
  registerLink: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
    fontSize: 13.5,
  },
  footerCopyright: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
    textAlign: "center",
    marginTop: 32,
  },
});

export default LoginScreen;
