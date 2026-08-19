import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SHADOWS, ROUNDING, FONTS } from "../../theme/tokens";

const LandingScreen = ({ navigation }) => {
  const features = [
    { icon: "location-outline", text: "GPS Geofence Attendance Validation" },
    { icon: "checkbox-outline", text: "Task & Subtask Checklist Workflows" },
    { icon: "calendar-outline", text: "Leave Requests & Dynamic Balances" },
    { icon: "cash-outline", text: "Automated Monthly Payslips & Payroll" }
  ];

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
        {/* ── Top Brand Header & Un-cropped Logo ── */}
        <View style={styles.headerSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../../assets/icoded_logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.brandTitle}>Nextact</Text>
          <Text style={styles.brandSubtitle}>SMART WORKFORCE PLATFORM</Text>
        </View>

        {/* ── Headline ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Manage Your Workforce With Ease
          </Text>
        </View>

        {/* ── Clean Features List ── */}
        <View style={styles.featuresGrid}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={f.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryBtnTouch}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Get Started Free</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Sign In to Workspace</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoWrapper: {
    width: 160,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  brandTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 28,
    color: COLORS.darkNavy,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  heroSection: {
    alignItems: "center",
    marginVertical: 10,
  },
  heroTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: COLORS.darkNavy,
    textAlign: "center",
    lineHeight: 32,
  },
  featuresGrid: {
    gap: 12,
    marginVertical: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: ROUNDING.lg,
    padding: 14,
    ...SHADOWS.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(249, 115, 22, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  featureText: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 10,
  },
  primaryBtnTouch: {
    borderRadius: ROUNDING.xl,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: COLORS.darkNavy,
    paddingVertical: 15,
    borderRadius: ROUNDING.xl,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: COLORS.darkNavy,
  },
});

export default LandingScreen;
