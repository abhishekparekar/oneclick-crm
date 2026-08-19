import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppCard from "../../components/AppCard";
import AppInput from "../../components/AppInput";
import { getAuditLogsApi } from "../../api/superAdminService";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const MODULES_FILTER = [
  { label: "All Modules", value: "" },
  { label: "Company", value: "Company" },
  { label: "Plan", value: "Plan" },
  { label: "Subscription", value: "Subscription" },
  { label: "User", value: "User" },
  { label: "Payment", value: "Payment" },
  { label: "Settings", value: "Settings" },
];

const AuditLogsScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [error, setError] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const { data } = await getAuditLogsApi();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [])
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const getModuleColor = (mod) => {
    switch (mod) {
      case "Company":
        return { bg: "#eff6ff", text: "#1e40af" };
      case "Plan":
        return { bg: "#f5f3ff", text: "#5b21b6" };
      case "Subscription":
        return { bg: "#ecfdf5", text: "#065f46" };
      case "User":
        return { bg: "#fff7ed", text: "#9a3412" };
      case "Payment":
        return { bg: "#fdf2f8", text: "#9d174d" };
      default:
        return { bg: "#f1f5f9", text: "#334155" };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.companyId?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      log.ipAddress?.includes(search);
      
    const matchesModule = !selectedModule || log.module === selectedModule;

    return matchesSearch && matchesModule;
  });

  const renderItem = ({ item }) => {
    const isExpanded = expandedLogId === item._id;
    const theme = getModuleColor(item.module);

    return (
      <AppCard style={styles.card}>
        <TouchableOpacity onPress={() => toggleExpand(item._id)} activeOpacity={0.9}>
          <View style={styles.cardHeader}>
            <View style={[styles.moduleBadge, { backgroundColor: theme.bg }]}>
              <Text style={[styles.moduleText, { color: theme.text }]}>{item.module}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          <Text style={styles.actionText}>{item.action.replace(/_/g, " ")}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.metaText} numberOfLines={1}>{item.performedBy?.name || "System"}</Text>
            </View>
            {item.companyId?.companyName && (
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.metaText} numberOfLines={1}>{item.companyId.companyName}</Text>
              </View>
            )}
          </View>

          {item.ipAddress && (
            <View style={styles.ipRow}>
              <Ionicons name="desktop-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.ipText}>IP: {item.ipAddress}</Text>
            </View>
          )}

          {/* Expandable change diff inspect container */}
          {isExpanded && (item.oldData || item.newData) && (
            <View style={styles.expandableArea}>
              <Text style={styles.diffHeading}>Inspecting Database Snapshot</Text>
              {item.oldData && Object.keys(item.oldData).length > 0 && (
                <View style={styles.diffBox}>
                  <Text style={styles.diffSub}>Before Changes:</Text>
                  <Text style={styles.codeText}>{JSON.stringify(item.oldData, null, 2)}</Text>
                </View>
              )}
              {item.newData && Object.keys(item.newData).length > 0 && (
                <View style={styles.diffBox}>
                  <Text style={styles.diffSub}>After Changes:</Text>
                  <Text style={[styles.codeText, { color: "#0d9488" }]}>{JSON.stringify(item.newData, null, 2)}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.expandIndicatorRow}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="#94a3b8"
            />
          </View>
        </TouchableOpacity>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>System Audit Trails</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <AppInput
            placeholder="Search by action, operator, company or IP..."
            value={search}
            onChangeText={setSearch}
            icon="search"
          />
        </View>

        {/* Modules Filter Selector Row */}
        <View style={styles.filterSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={MODULES_FILTER}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedModule === item.value && styles.filterTabActive,
                ]}
                onPress={() => setSelectedModule(item.value)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    selectedModule === item.value && styles.filterTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && logs.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchLogs(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No audit logs matching selection.</Text>
              </View>
            }
          />
        )}
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchBox: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#fff" },
  filterSection: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 8 },
  filterList: { paddingHorizontal: 16 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, backgroundColor: "#f1f5f9", marginRight: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  filterTabActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  filterTabText: { fontSize: 12, fontWeight: "500", color: "#475569" },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 12, padding: 12, borderRadius: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  moduleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  moduleText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  dateText: { fontSize: 11, color: "#94a3b8" },
  actionText: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 6, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", marginRight: 14 },
  metaText: { fontSize: 11, color: "#64748b" },
  ipRow: { flexDirection: "row", alignItems: "center" },
  ipText: { fontSize: 11, color: "#94a3b8" },
  expandableArea: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10 },
  diffHeading: { fontSize: 11, fontWeight: "700", color: "#475569", marginBottom: 8 },
  diffBox: { backgroundColor: "#0f172a", padding: 10, borderRadius: 6, marginBottom: 8 },
  diffSub: { fontSize: 10, color: "#94a3b8", fontWeight: "600", marginBottom: 4 },
  codeText: { fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace", fontSize: 9, color: "#f87171" },
  expandIndicatorRow: { alignItems: "center", marginTop: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default AuditLogsScreen;
