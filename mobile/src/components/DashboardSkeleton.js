import React from "react";
import { View, StyleSheet, Animated } from "react-native";

const DashboardSkeleton = () => {
  // A simple pulsing animation for the skeleton
  const pulseAnim = React.useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <Animated.View style={[styles.headerCard, { opacity: pulseAnim }]}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineLong} />
      </Animated.View>

      {/* Overview Grid Skeleton */}
      <View style={styles.skeletonTitle} />
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <Animated.View key={`stat-${i}`} style={[styles.statCard, { opacity: pulseAnim }]}>
            <View style={styles.statTop}>
              <View style={styles.iconCircle} />
              <View style={styles.statValue} />
            </View>
            <View style={styles.statTitle} />
          </Animated.View>
        ))}
      </View>

      {/* Quick Actions Skeleton */}
      <View style={styles.skeletonTitle} />
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <Animated.View key={`action-${i}`} style={[styles.actionCard, { opacity: pulseAnim }]}>
            <View style={styles.actionIcon} />
            <View style={styles.actionTitle} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: "#e2e8f0",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    height: 80,
    justifyContent: "center",
  },
  skeletonLineShort: {
    height: 12,
    backgroundColor: "#cbd5e1",
    borderRadius: 6,
    width: "30%",
    marginBottom: 10,
  },
  skeletonLineLong: {
    height: 20,
    backgroundColor: "#cbd5e1",
    borderRadius: 10,
    width: "70%",
  },
  skeletonTitle: {
    height: 18,
    backgroundColor: "#e2e8f0",
    borderRadius: 9,
    width: 120,
    marginBottom: 12,
    marginLeft: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    height: 100,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
  statValue: {
    width: 40,
    height: 24,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
  },
  statTitle: {
    height: 14,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    width: "80%",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0",
    marginBottom: 10,
  },
  actionTitle: {
    height: 14,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    width: "60%",
  },
});

export default DashboardSkeleton;
