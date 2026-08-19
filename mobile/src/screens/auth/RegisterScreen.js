import { useState } from "react";
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
import { COLORS, ROUNDING, FONTS, SHADOWS } from "../../theme/tokens";

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

  const set = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
        `Your 7-day free trial has started. You can add up to 10 employees.`,
        [{ text: "Get Started" }]
      );
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

        {/* Trial Badge */}
        <View style={styles.trialBadge}>
          <Ionicons name="sparkles" size={13} color={COLORS.primary} />
          <Text style={styles.trialBadgeText}>
            7-Day Free Trial • 10 Employees Included
          </Text>
        </View>

        <Text style={styles.heading}>Register Company</Text>
        <Text style={styles.subheading}>Set up your organization workspace</Text>

        {/* Company Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="business-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.companyName}
              onChangeText={set("companyName")}
              placeholder="e.g. Acme Corporation"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Owner Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Owner / Admin Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.ownerName}
              onChangeText={set("ownerName")}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Email Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Work Email Address *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={set("email")}
              placeholder="admin@company.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={set("phone")}
              placeholder="+91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={set("password")}
              placeholder="Create a strong password"
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

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={set("confirmPassword")}
              placeholder="Re-enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon} activeOpacity={0.7}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
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
          onPress={handleRegister}
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
                <Text style={styles.buttonText}>Creating Workspace...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Create Company Workspace →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>Already have a company account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.7}>
            <Text style={styles.loginLink}>Sign In →</Text>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
  },
  logoWrapper: {
    alignSelf: "center",
    width: 170,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  trialBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 16,
  },
  trialBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#EA580C",
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
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
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
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    gap: 4,
  },
  loginHint: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
    fontSize: 13.5,
  },
  loginLink: {
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

export default RegisterScreen;
