import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppCard from "../../components/AppCard";
import AppInput from "../../components/AppInput";
import { getLoginHistoryApi } from "../../api/superAdminService";

const ROLE_FILTERS = [
  { label: "All Roles", value: "" },
  { label: "Super Admin", value: "SuperAdmin" },
  { label: "Company Admin", value: "CompanyAdmin" },
  { label: "HR Manager", value: "HR" },
  { label: "Team Member", value: "Team Member" },
];

const LoginHistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");

  const fetchHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const { data } = await getLoginHistoryApi();
      setHistory(data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load login audit logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

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

  const getDeviceIcon = (deviceStr) => {
    const desc = (deviceStr || "").toLowerCase();
    if (desc.includes("iphone") || desc.includes("android") || desc.includes("mobile")) {
      return "phone-portrait-outline";
    }
    if (desc.includes("ipad") || desc.includes("tablet")) {
      return "tablet-portrait-outline";
    }
    return "desktop-outline";
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
      item.companyId?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      item.device?.toLowerCase().includes(search.toLowerCase()) ||
      item.ipAddress?.includes(search);

    const matchesRole = !selectedRole || item.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  const renderItem = ({ item }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.userId?.name ? item.userId.name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "U"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.userId?.name || "Deleted User"}</Text>
            <Text style={styles.userEmail}>{item.userId?.email || "-"}</Text>
          </View>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
      </View>

      <View style={styles.detailsDivider} />

      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color="#64748b" style={styles.infoIcon} />
          <Text style={styles.infoText} numberOfLines={1}>
            Company: <Text style={styles.boldVal}>{item.companyId?.companyName || "One Click Support"}</Text>
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name={getDeviceIcon(item.device)} size={14} color="#64748b" style={styles.infoIcon} />
          <Text style={styles.infoText} numberOfLines={1}>
            Device: <Text style={styles.boldVal}>{item.device || "Unknown Agent"}</Text>
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="earth-outline" size={14} color="#64748b" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            IP Address: <Text style={styles.boldVal}>{item.ipAddress || "127.0.0.1"}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.timeFooter}>
        <Ionicons name="time-outline" size={13} color="#94a3b8" style={{ marginRight: 4 }} />
        <Text style={styles.timeText}>Logged in: {formatDate(item.loginAt || item.createdAt)}</Text>
      </View>
    </AppCard>
  );

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>Login Access Logs</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <AppInput
            placeholder="Search by user, email, company, device or IP..."
            value={search}
            onChangeText={setSearch}
            icon="search"
          />
        </View>

        {/* Roles Filter Selector Row */}
        <View style={styles.filterSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={ROLE_FILTERS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedRole === item.value && styles.filterTabActive,
                ]}
                onPress={() => setSelectedRole(item.value)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    selectedRole === item.value && styles.filterTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && history.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="lock-open-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No login history events found.</Text>
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
  card: { marginBottom: 12, padding: 14, borderRadius: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  userEmail: { fontSize: 11, color: "#64748b", marginTop: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  roleText: { fontSize: 10, fontWeight: "600", color: "#475569" },
  detailsDivider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 10 },
  infoGrid: { paddingLeft: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoIcon: { marginRight: 8, width: 14, textAlign: "center" },
  infoText: { fontSize: 12, color: "#475569", flex: 1 },
  boldVal: { fontWeight: "600", color: "#1e293b" },
  timeFooter: { flexDirection: "row", alignItems: "center", marginTop: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 8 },
  timeText: { fontSize: 11, color: "#94a3b8" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default LoginHistoryScreen;
