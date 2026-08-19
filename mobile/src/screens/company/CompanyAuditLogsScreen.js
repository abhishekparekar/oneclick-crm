import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import { useAuth } from "../../context/AuthContext";
import { getCompanyAuditLogsApi } from "../../api/companyService";

const CompanyAuditLogsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "CompanyAdmin";
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['companyAuditLogs'],
    queryFn: async () => {
      const { data } = await getCompanyAuditLogsApi();
      return data?.logs || [];
    },
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <CompanyAdminLayout navigation={navigation} activeTab="Dashboard" showSearch={false}>
        <View style={styles.deniedContainer}>
          <Ionicons name="shield-ban-outline" size={80} color="#dc2626" />
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>
            This module is strictly restricted to Company Administrators. Your HR account does not have authorization to view activity logs.
          </Text>
        </View>
      </CompanyAdminLayout>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const action = log.action?.toLowerCase() || "";
    const details = log.details?.toLowerCase() || "";
    const performedBy = log.performedBy?.name?.toLowerCase() || "";
    const term = search.toLowerCase();

    return action.includes(term) || details.includes(term) || performedBy.includes(term);
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionIcon = (action) => {
    const act = action?.toLowerCase() || "";
    if (act.includes("create") || act.includes("add")) {
      return { name: "add-circle", color: "#10b981" };
    }
    if (act.includes("update") || act.includes("edit") || act.includes("modify")) {
      return { name: "create", color: "#2563eb" };
    }
    if (act.includes("delete") || act.includes("remove")) {
      return { name: "trash", color: "#dc2626" };
    }
    if (act.includes("approve") || act.includes("accept")) {
      return { name: "checkmark-circle", color: "#16a34a" };
    }
    if (act.includes("reject") || act.includes("decline")) {
      return { name: "close-circle", color: "#b91c1c" };
    }
    return { name: "information-circle", color: "#64748b" };
  };

  const renderLogItem = ({ item, index }) => {
    const iconInfo = getActionIcon(item.action);
    const isLast = index === filteredLogs.length - 1;

    const name = item.performedBy?.name || "System Admin";
    const role = item.performedBy?.role || "Admin";
    const rawAction = item.action || "action";
    const actionFormatted = rawAction.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    let detailsStr = item.module ? `Module: ${item.module}` : "No details provided";
    if (item.newData) {
      if (item.newData.status) detailsStr += ` | Status: ${item.newData.status}`;
      if (item.newData.reason) detailsStr += ` | Reason: ${item.newData.reason}`;
    }

    return (
      <View style={styles.timelineRow}>
        {/* Timeline Line/Dots */}
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineDot, { backgroundColor: iconInfo.color }]}>
            <Ionicons name={iconInfo.name} size={12} color="#ffffff" />
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Timeline Content */}
        <View style={styles.timelineContent}>
          <View style={styles.logHeader}>
            <Text style={styles.logAction}>{actionFormatted}</Text>
            <Text style={styles.logTime}>{formatDate(item.createdAt)}</Text>
          </View>

          <Text style={styles.logDetails}>{detailsStr}</Text>

          <View style={styles.logMeta}>
            <Text style={styles.metaLabel}>BY:</Text>
            <Text style={styles.metaVal}>{name} ({role})</Text>
            {item.ipAddress && (
              <>
                <Text style={styles.metaLabelDivider}>·</Text>
                <Text style={styles.metaLabel}>IP:</Text>
                <Text style={styles.metaVal}>{item.ipAddress}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Dashboard"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Filter logs by action, details, user..."
    >
      <View style={styles.screenHeader}>
        <Text style={styles.title}>System Audit Logs</Text>
        <Text style={styles.subtitle}>
          Track real-time administrative actions, security changes, and employee modifications
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching logs stream...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item._id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>No matching audit activities recorded</Text>
            </View>
          }
        />
      )}
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 80,
  },
  timelineLeft: {
    width: 32,
    alignItems: "center",
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  timelineLine: {
    width: 2,
    backgroundColor: "#cbd5e1",
    position: "absolute",
    top: 24,
    bottom: 0,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  logAction: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 6,
  },
  logTime: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  logDetails: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 8,
  },
  logMeta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    marginRight: 4,
  },
  metaVal: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  metaLabelDivider: {
    fontSize: 10,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 12,
    fontWeight: "500",
  },
  deniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#dc2626",
    marginTop: 16,
    marginBottom: 8,
  },
  deniedText: {
    fontSize: 13.5,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default CompanyAuditLogsScreen;
