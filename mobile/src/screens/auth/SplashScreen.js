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
        navigation.replace("Login");
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, navigation]);

  return (
    <LinearGradient
      colors={["#071A2F", "#082B52", "#050F1F"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#071A2F" />

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
          source={require("../../../assets/one_click_.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated Brand Title & Subtitle */}
      <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
        <Text style={styles.title}>One Click</Text>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.subtitle}>BUSINESS & HRMS</Text>
          <View style={styles.dividerLine} />
        </View>
      </Animated.View>

      {/* Footer tagline indicator */}
      <Animated.View style={[styles.footerProgress, { opacity: textFadeAnim }]}>
        <View style={styles.progressDot} />
        <Text style={styles.footerText}>One Click Business Management</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#071A2F",
  },
  glowCircleTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(18, 104, 217, 0.2)",
  },
  glowCircleBottom: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(21, 151, 229, 0.15)",
  },
  logoContainer: {
    width: 250,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "#1268D9",
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2F8BFF",
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
