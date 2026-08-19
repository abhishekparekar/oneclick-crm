import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppCard from "../../components/AppCard";
import {
  getGlobalUsersApi,
  updateUserStatusApi,
} from "../../api/superAdminService";

const ROLES = [
  { label: "All Roles", value: "" },
  { label: "Admins", value: "CompanyAdmin" },
  { label: "HR", value: "HR" },
  { label: "Managers", value: "Manager" },
  { label: "Team Members", value: "Team Member" },
];

const STATUS_FILTERS = [
  { label: "All Status", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const GlobalUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = {};
      if (search) params.search = search;
      if (selectedRole) params.role = selectedRole;
      if (selectedStatus) params.status = selectedStatus;

      const { data } = await getGlobalUsersApi(params);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load global users list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [search, selectedRole, selectedStatus])
  );

  const handleToggleStatus = (user) => {
    const nextStatus = user.isActive ? "inactive" : "active";
    Alert.alert(
      "Confirm Status Change",
      `Are you sure you want to make ${user.name} ${nextStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: nextStatus === "inactive" ? "destructive" : "default",
          onPress: () => changeUserStatus(user._id, nextStatus),
        },
      ]
    );
  };

  const changeUserStatus = async (id, status) => {
    setActionLoadingId(id);
    try {
      await updateUserStatusApi(id, status);
      Alert.alert("Success", `User status updated to ${status}`);
      fetchUsers();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "SuperAdmin":
        return "shield-checkmark-outline";
      case "CompanyAdmin":
        return "business-outline";
      case "HR":
        return "people-outline";
      case "Manager":
        return "git-network-outline";
      default:
        return "person-outline";
    }
  };

  const renderItem = ({ item }) => {
    const isActionLoading = actionLoadingId === item._id;

    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "U"}
            </Text>
          </View>
          <View style={styles.metaContent}>
            <Text style={styles.userName}>{item.name}</Text>
            <View style={styles.roleRow}>
              <Ionicons name={getRoleIcon(item.role)} size={13} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.badge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}
            onPress={() => handleToggleStatus(item)}
            disabled={isActionLoading}
          >
            <Text style={styles.badgeText}>{item.isActive ? "Active" : "Inactive"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailsRow}>
            <Ionicons name="mail-outline" size={14} color="#64748b" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
          {item.phone && (
            <View style={styles.detailsRow}>
              <Ionicons name="call-outline" size={14} color="#64748b" style={styles.detailIcon} />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.detailsRow}>
            <Ionicons name="business-outline" size={14} color="#64748b" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              Company: <Text style={{ fontWeight: "600" }}>{item.companyId?.companyName || "N/A"}</Text>
            </Text>
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>Global Users Directory</Text>

        {/* Search Field */}
        <View style={styles.searchBox}>
          <AppInput
            placeholder="Search by name, email or phone..."
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
            data={ROLES}
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

        {/* Status Filter Selector Row */}
        <View style={[styles.filterSection, { borderTopWidth: 0, paddingBottom: 10 }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  selectedStatus === item.value && styles.filterTabActive,
                ]}
                onPress={() => setSelectedStatus(item.value)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    selectedStatus === item.value && styles.filterTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && users.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No users match the criteria.</Text>
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
  filterSection: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
  },
  filterList: { paddingHorizontal: 16 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterTabActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterTabText: { fontSize: 12, fontWeight: "500", color: "#475569" },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14, padding: 14, borderRadius: 12 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: "#2563eb" },
  metaContent: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  roleRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  roleText: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  activeBadge: { backgroundColor: "#dcfce7" },
  inactiveBadge: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#1e293b" },
  detailsSection: { paddingLeft: 4 },
  detailsRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  detailIcon: { marginRight: 8, width: 14, textAlign: "center" },
  detailText: { fontSize: 12, color: "#475569" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default GlobalUsersScreen;
