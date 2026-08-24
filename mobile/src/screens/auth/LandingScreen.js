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
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from "react-native-svg";
import { FONTS } from "../../theme/tokens";

const LandingScreen = ({ navigation }) => {
  const features = [
    { icon: "location-outline", text: "GPS Geofence Attendance Validation", color: "#FB923C" },
    { icon: "checkbox-outline", text: "Task & Subtask Checklist Workflows", color: "#38BDF8" },
    { icon: "calendar-outline", text: "Leave Requests & Dynamic Balances", color: "#E879F9" },
    { icon: "cash-outline", text: "Automated Monthly Payslips & Payroll", color: "#4ADE80" },
  ];

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* ── Ambient Background Glows ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.topRightGlow}>
          <LinearGradient
            colors={["rgba(217, 70, 239, 0.25)", "rgba(139, 92, 246, 0.1)", "transparent"]}
            style={styles.glowCircle}
            start={{ x: 0.8, y: 0.2 }}
            end={{ x: 0.1, y: 0.9 }}
          />
        </View>
        <View style={styles.bottomLeftGlow}>
          <Svg height={350} width={350} viewBox="0 0 350 350">
            <Defs>
              <SvgRadial id="amberGlowLand" cx="30%" cy="70%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                <Stop offset="50%" stopColor="#EA580C" stopOpacity="0.15" />
                <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
              </SvgRadial>
            </Defs>
            <Circle cx="150" cy="220" r="160" fill="url(#amberGlowLand)" />
          </Svg>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Brand Header & Logo ── */}
        <View style={styles.headerSection}>
          <View style={styles.logoSection}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandSubtitle}>ONE CLICK BUSINESS PLATFORM</Text>
        </View>

        {/* ── Headline with Multi-Color Accent ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            <Text style={{ color: "#F8FAFC" }}>Manage Your </Text>
            <Text style={{ color: "#FB923C" }}>Workforce </Text>
            <Text style={{ color: "#38BDF8" }}>With Ease</Text>
          </Text>
        </View>

        {/* ── Clean Glassy Features List ── */}
        <View style={styles.featuresGrid}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.iconCircle, { backgroundColor: `${f.color}18` }]}>
                <Ionicons name={f.icon} size={18} color={f.color} />
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
              colors={["#1268D9", "#0D50B8", "#082B52"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
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

        <Text style={styles.footerCopyright}>
          © One Click Business HRMS • Powered by icoded
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: Platform.OS === "ios" ? 54 : 40,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  topRightGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
  },
  bottomLeftGlow: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 350,
    height: 350,
  },
  glowCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 140,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 10,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 6,
  },
  logoImage: {
    width: 220,
    height: 64,
  },
  brandSubtitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: "#94A3B8",
    letterSpacing: 1.6,
  },
  heroSection: {
    alignItems: "center",
    marginVertical: 14,
  },
  heroTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
  },
  featuresGrid: {
    gap: 12,
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1.2,
    borderColor: "rgba(148, 163, 184, 0.14)",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  featureText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13.5,
    color: "#E2E8F0",
  },
  actionsContainer: {
    gap: 12,
    marginTop: 16,
  },
  primaryBtnTouch: {
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#F43F5E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.16)",
    height: 50,
    borderRadius: 25,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: "#F1F5F9",
  },
  footerCopyright: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    marginTop: 20,
  },
});

export default LandingScreen;
