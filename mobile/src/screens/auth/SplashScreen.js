import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";

const SplashScreen = ({ navigation }) => {
  const { isLoading, isAuthenticated } = useAuth();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations: Scale up logo + Fade in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade in brand text
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Continuous subtle pulsing glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        navigation.replace("Landing");
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, navigation]);

  return (
    <LinearGradient
      colors={["#0F172A", "#1E293B", "#0F172A"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Decorative ambient background glows */}
      <View style={styles.glowCircleTop} />
      <View style={styles.glowCircleBottom} />

      {/* Animated Logo Wrapper */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          },
        ]}
      >
        <Image
          source={require("../../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated Brand Title & Subtitle */}
      <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
        <Text style={styles.title}>Nextact</Text>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.subtitle}>WORKFORCE & HRMS</Text>
          <View style={styles.dividerLine} />
        </View>
      </Animated.View>

      {/* Footer tagline indicator */}
      <Animated.View style={[styles.footerProgress, { opacity: textFadeAnim }]}>
        <View style={styles.progressDot} />
        <Text style={styles.footerText}>Smart HR & Business Management</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  glowCircleTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(249, 115, 22, 0.12)",
  },
  glowCircleBottom: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 32,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: "Outfit-Bold",
    letterSpacing: -0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  dividerLine: {
    width: 24,
    height: 1.5,
    backgroundColor: "#F97316",
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F97316",
    fontFamily: "Outfit-Bold",
    letterSpacing: 2,
  },
  footerProgress: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
    fontFamily: "Outfit-Medium",
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
