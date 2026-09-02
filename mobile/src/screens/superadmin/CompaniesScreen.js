import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import AppCard from "../../components/AppCard";
import {
  getCompaniesApi,
  updateCompanyStatusApi,
} from "../../api/superAdminService";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
];

const CompaniesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchCompanies = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const { data } = await getCompaniesApi(params);
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load companies");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
    }, [search, statusFilter])
  );

  const handleUpdateStatus = (id, currentStatus) => {
    Alert.alert(
      "Update Company Status",
      "Select a new status for this company:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Active",
          onPress: () => changeStatus(id, "active"),
        },
        {
          text: "Inactive",
          onPress: () => changeStatus(id, "inactive"),
        },
        {
          text: "Suspend",
          style: "destructive",
          onPress: () => changeStatus(id, "suspended"),
        },
      ]
    );
  };

  const changeStatus = async (id, status) => {
    setActionLoadingId(id);
    try {
      await updateCompanyStatusApi(id, status);
      Alert.alert("Success", `Company status updated to ${status}`);
      fetchCompanies();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "active":
        return styles.activeBadge;
      case "inactive":
        return styles.inactiveBadge;
      case "suspended":
        return styles.suspendedBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const renderItem = ({ item }) => {
    const isActionLoading = actionLoadingId === item._id;

    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.companyName}
          </Text>
          <View style={[styles.badge, getStatusStyle(item.status)]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color="#6b7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>{item.ownerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color="#6b7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>{item.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={14} color="#6b7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>{item.phone || "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color="#6b7280" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {item.industryType || "-"} • Max {item.employeeLimit} Employees
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.detailsBtn]}
            onPress={() => navigation.navigate("CompanyDetails", { companyId: item._id })}
          >
            <Ionicons name="eye-outline" size={16} color="#2563eb" />
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate("AddCompany", { companyId: item._id })}
          >
            <Ionicons name="create-outline" size={16} color="#059669" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.statusBtn]}
            onPress={() => handleUpdateStatus(item._id, item.status)}
            disabled={isActionLoading}
          >
            <Ionicons name="settings-outline" size={16} color="#d97706" />
            <Text style={styles.statusBtnText}>Status</Text>
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Companies">
      <View style={styles.container}>
        {/* Search and Filters Header */}
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
            <AppInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search companies by name/email..."
              style={styles.searchInput}
              containerStyle={styles.searchWrapper}
            />
          </View>

          {/* Status Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <TouchableOpacity
                  key={filter.label}
                  onPress={() => setStatusFilter(filter.value)}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && companies.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={companies}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchCompanies(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No companies found matching criteria.</Text>
                <AppButton
                  title="Add New Company"
                  onPress={() => navigation.navigate("AddCompany")}
                  style={styles.emptyBtn}
                />
              </View>
            }
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(20, insets.bottom + 20) }]}
          onPress={() => navigation.navigate("AddCompany")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  filterCard: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchWrapper: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    height: 40,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  searchInput: {
    fontSize: 13,
    height: 40,
    color: "#f8fafc",
  },
  filterScroll: {
    paddingVertical: 4,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "#f59e0b",
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  filterTabTextActive: {
    color: "#f59e0b",
    fontWeight: "800",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 8,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f8fafc",
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadge: { backgroundColor: "rgba(16, 185, 129, 0.15)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" },
  inactiveBadge: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)" },
  suspendedBadge: { backgroundColor: "rgba(245, 158, 11, 0.15)", borderWidth: 1, borderColor: "rgba(245, 158, 11, 0.3)" },
  defaultBadge: { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155" },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f8fafc",
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  infoIcon: {
    marginRight: 8,
    width: 16,
    textAlign: "center",
    color: "#f59e0b",
  },
  infoText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 3,
  },
  detailsBtn: {
    borderColor: "rgba(6, 182, 212, 0.4)",
    backgroundColor: "rgba(6, 182, 212, 0.1)",
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#06B6D4",
    marginLeft: 4,
  },
  editBtn: {
    borderColor: "rgba(245, 158, 11, 0.4)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f59e0b",
    marginLeft: 4,
  },
  statusBtn: {
    borderColor: "rgba(139, 92, 246, 0.4)",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8b5cf6",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    marginVertical: 12,
    textAlign: "center",
  },
  emptyBtn: {
    width: 200,
    backgroundColor: "#f59e0b",
  },
  errorText: {
    color: "#f87171",
    padding: 12,
    textAlign: "center",
    fontSize: 12,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});

export default CompaniesScreen;
