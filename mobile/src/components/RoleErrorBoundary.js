import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default class RoleErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[RoleErrorBoundary] Caught unhandled error in navigator:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { role, onLogout } = this.props;
      return (
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="alert-circle" size={44} color="#EF4444" />
              </View>
              <Text style={styles.title}>Workspace Notice</Text>
              <Text style={styles.sub}>
                An unexpected issue occurred while rendering your {role || "workspace"} view.
              </Text>

              {this.state.error?.message ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText} numberOfLines={4}>
                    {String(this.state.error.message)}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Reload Workspace</Text>
              </TouchableOpacity>

              {onLogout && (
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
                  <Ionicons name="log-out-outline" size={18} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.logoutBtnText}>Sign Out / Change Account</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#FFF1F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  errorText: {
    fontSize: 12,
    color: "#BE123C",
    fontFamily: "monospace",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1268D9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 12,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  logoutBtnText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
});
